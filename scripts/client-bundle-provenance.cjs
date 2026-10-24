const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');
const { AnyMap, decodedMappings, eachMapping } = require('@jridgewell/trace-mapping');

// Next writes these data-only manifests without a source map. No arbitrary module
// code, imports or external function calls are accepted under that exception.
function isGeneratedManifest(file) {
  const names = { '_buildManifest.js': '__BUILD_MANIFEST', '_ssgManifest.js': '__SSG_MANIFEST' };
  const name = names[path.basename(file)];
  if (!name) return false;
  const unwrap = node => ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
  const selfProperty = (node, property) => ts.isPropertyAccessExpression(node)
    && ts.isIdentifier(node.expression) && node.expression.text === 'self' && node.name.text === property;
  const data = (input, scope = new Set()) => {
    const node = unwrap(input);
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)) return true;
    if (ts.isIdentifier(node)) return node.text === 'undefined' || scope.has(node.text);
    if (ts.isPrefixUnaryExpression(node)) return [ts.SyntaxKind.MinusToken, ts.SyntaxKind.PlusToken].includes(node.operator) && ts.isNumericLiteral(node.operand);
    if (ts.isArrayLiteralExpression(node)) return node.elements.every(element => data(element, scope));
    if (ts.isObjectLiteralExpression(node)) return node.properties.every(property => ts.isPropertyAssignment(property)
      && !ts.isComputedPropertyName(property.name) && data(property.initializer, scope));
    if (ts.isFunctionExpression(node)) {
      if (node.parameters.some(parameter => !ts.isIdentifier(parameter.name) || parameter.initializer || parameter.dotDotDotToken)) return false;
      const nested = new Set([...scope, ...node.parameters.map(parameter => parameter.name.text)]);
      return node.body.statements.length === 1 && ts.isReturnStatement(node.body.statements[0])
        && node.body.statements[0].expression && data(node.body.statements[0].expression, nested);
    }
    if (ts.isCallExpression(node)) return ts.isFunctionExpression(unwrap(node.expression))
      && data(node.expression, scope) && node.arguments.every(argument => data(argument, scope));
    return ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Set'
      && (!node.arguments || node.arguments.length === 0 || (node.arguments.length === 1 && ts.isArrayLiteralExpression(node.arguments[0]) && data(node.arguments[0], scope)));
  };
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (source.parseDiagnostics.length || source.statements.length < 1 || source.statements.length > 2) return false;
  const first = source.statements[0];
  if (!ts.isExpressionStatement(first) || !ts.isBinaryExpression(first.expression)
    || first.expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken
    || !selfProperty(first.expression.left, name) || !data(first.expression.right)) return false;
  if (source.statements.length === 1) return true;
  const last = source.statements[1];
  return ts.isExpressionStatement(last) && ts.isBinaryExpression(last.expression)
    && last.expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
    && selfProperty(last.expression.left, name + '_CB') && ts.isCallExpression(last.expression.right)
    && selfProperty(last.expression.right.expression, name + '_CB') && last.expression.right.arguments.length === 0;
}

function ownedSource(source) {
  const normalized = decodeURIComponent(source).replaceAll('\\', '/').replace(/[?#].*$/, '');
  const marker = '/node_modules/@mairie360/lib-components/';
  const index = normalized.lastIndexOf(marker);
  const relative = index >= 0 ? normalized.slice(index + marker.length)
    : normalized.match(/^(?:webpack:\/\/)?@mairie360\/lib-components\/(.*)$/)?.[1];
  if (relative === undefined) return undefined;
  const clean = path.posix.normalize(relative);
  assert.ok(!clean.startsWith('../') && !path.posix.isAbsolute(clean), 'Invalid owned source path');
  return clean;
}

function validateMap(map) {
  assert.ok(map && map.version === 3, 'Invalid source map version');
  if (map.sections) {
    assert.ok(Array.isArray(map.sections) && map.sections.length > 0, 'Invalid indexed source map');
    for (const section of map.sections) {
      assert.ok(Number.isInteger(section.offset?.line) && section.offset.line >= 0 && Number.isInteger(section.offset?.column) && section.offset.column >= 0 && !section.url, 'Invalid source map section');
      validateMap(section.map);
    }
    return;
  }
  assert.ok(Array.isArray(map.sources) && map.sources.every(source => typeof source === 'string'), 'Invalid source map sources');
  assert.ok(Array.isArray(map.names) && map.names.every(name => typeof name === 'string'), 'Invalid source map names');
  assert.ok(typeof map.mappings === 'string' && /^[A-Za-z0-9+/;,]*$/.test(map.mappings), 'Invalid source map mappings');
}

// The official TSUP output has empty maps for pure re-export barrels. Their
// only runtime effect is loading the named local chunks, all of which must be
// traversed and mapped. Any executable statement or external reference fails.
function barrelReferences(file) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (source.parseDiagnostics.length) return undefined;
  const imported = new Set(), exported = [], references = [];
  let modules = false;
  for (const statement of source.statements) {
    if (!modules && ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)
      && statement.expression.text === 'use client') continue;
    modules = true;
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (!clause || clause.isTypeOnly || clause.name || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)
        || clause.namedBindings.elements.length === 0 || statement.attributes || !ts.isStringLiteral(statement.moduleSpecifier)
        || !/^\.\/chunk-[A-Z0-9]+\.js$/.test(statement.moduleSpecifier.text)) return undefined;
      for (const binding of clause.namedBindings.elements) {
        if (binding.isTypeOnly || !ts.isIdentifier(binding.name) || (binding.propertyName && !ts.isIdentifier(binding.propertyName))) return undefined;
        imported.add(binding.name.text);
      }
      references.push(path.resolve(path.dirname(file), statement.moduleSpecifier.text));
    } else if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && !statement.moduleSpecifier
      && statement.exportClause && ts.isNamedExports(statement.exportClause) && statement.exportClause.elements.length > 0) {
      for (const binding of statement.exportClause.elements) {
        if (binding.isTypeOnly || !ts.isIdentifier(binding.name) || (binding.propertyName && !ts.isIdentifier(binding.propertyName))) return undefined;
        exported.push((binding.propertyName || binding.name).text);
      }
    } else return undefined;
  }
  return references.length > 0 && exported.length > 0 && exported.every(name => imported.has(name)) ? references : undefined;
}

function readMappedSources(file, { browser = false } = {}) {
  const mapFile = file + '.map';
  assert.ok(fs.existsSync(mapFile), `Source map required for ${file}; use the CI bundle provenance build`);
  let payload;
  try { payload = JSON.parse(fs.readFileSync(mapFile, 'utf8')); }
  catch (error) { throw new Error(`Invalid source map ${mapFile}: ${error.message}`); }
  validateMap(payload);
  const map = AnyMap(payload, pathToFileURL(mapFile).href);
  let mapped = 0;
  for (const line of decodedMappings(map)) {
    let previous = -1;
    for (const segment of line) {
      assert.ok([1, 4, 5].includes(segment.length) && segment.every(value => Number.isInteger(value) && value >= 0) && segment[0] >= previous, 'Invalid decoded source map segment');
      previous = segment[0];
      if (segment.length === 1) continue;
      assert.ok(segment[1] < map.sources.length && (segment.length < 5 || segment[4] < map.names.length), 'Source map index is out of range');
      mapped++;
    }
  }
  if (browser) assert.ok(mapped > 0, `Browser source map has no mapped sources: ${mapFile}`);
  const sources = new Set();
  eachMapping(map, mapping => {
    if (!mapping.source) return;
    const owned = ownedSource(mapping.source);
    // Every mapped reference source must retain its package identity. The
    // compiled dist path alone cannot prove original TSX absent from Next maps.
    if (!browser) assert.ok(owned, `Library source map lost ownership: ${mapFile}: ${mapping.source}`);
    if (owned) sources.add(owned);
  });
  if (!browser && mapped > 0) assert.ok(sources.size > 0, `No owned library source in ${mapFile}`);
  return { sources, mapped };
}

function verifyClientSourceMaps({ clientFiles, usedFiles, forbidden, libRoot }) {
  const cache = new Map(), visiting = new Set();
  const librarySources = files => {
    const result = new Set();
    for (const file of files) {
      if (!cache.has(file)) {
        assert.ok(fs.existsSync(file) && fs.statSync(file).isFile(), `Library reference file is missing: ${file}`);
        assert.ok(!visiting.has(file), `Cyclic library barrel cannot prove ownership: ${file}`);
        visiting.add(file);
        const relative = path.relative(libRoot, file).replaceAll('\\', '/');
        assert.ok(!relative.startsWith('../') && !path.isAbsolute(relative), 'Library source escaped its package');
        const { sources, mapped } = readMappedSources(file);
        if (mapped === 0) {
          const references = barrelReferences(file);
          assert.ok(references, `Library source map has no mapped sources and no covering barrel proof: ${file}.map`);
          for (const source of librarySources(references)) sources.add(source);
        }
        cache.set(file, new Set([relative, ...sources]));
        visiting.delete(file);
      }
      for (const source of cache.get(file)) result.add(source);
    }
    return result;
  };
  const used = librarySources(usedFiles);
  const client = new Set();
  for (const file of clientFiles) {
    if (!fs.existsSync(file + '.map') && isGeneratedManifest(file)) continue;
    for (const source of readMappedSources(file, { browser: true }).sources) client.add(source);
  }
  const proven = new Map();
  for (const [entry, files] of forbidden) {
    const distinct = [...librarySources(files)].filter(source => !used.has(source));
    assert.ok(distinct.length > 0, `${entry}: no distinct mapped source identity`);
    const leaked = distinct.filter(source => client.has(source));
    assert.deepEqual(leaked, [], `${entry}: forbidden library sources reached the browser bundle`);
    proven.set(entry, distinct.length);
  }
  // Positive control: an unrecognized namespace or stripped ownership metadata
  // must not silently turn every forbidden entry into an apparent absence.
  assert.ok([...used].some(source => client.has(source)), 'No used library source matched the browser maps; ownership proof is incomplete');
  return proven;
}

module.exports = { verifyClientSourceMaps };
