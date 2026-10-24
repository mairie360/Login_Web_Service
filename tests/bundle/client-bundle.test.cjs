const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const { verifyClientSourceMaps } = require('../../scripts/client-bundle-provenance.cjs');

// MAIR-126: the browser only receives the parts of @mairie360/lib-components this front's client code uses.
// Run after the CI measurement build (the performance workflow enables provenance maps). Each lib entry the client code does not
// use, and every server entry of the lib, is identified by the sentences that only its own bundle files
// contain; none of them may appear in the client JavaScript of the build. Source maps also identify
// code-only entries without a distinctive sentence. Identical file in every front.
const root = path.resolve(__dirname, '../..');
const src = path.join(root, 'src');
const lib = path.join(root, 'node_modules/@mairie360/lib-components');
const dist = path.join(lib, 'dist');
const clientDir = path.join(root, '.next/static');
const SERVER_ENTRIES = ['next', 'guard'];
const MIN_MARKER_LENGTH = 16;
const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function filesBelow(directory, filter) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(file, filter) : filter(file) ? [file] : [];
  });
}

const read = file => fs.readFileSync(file, 'utf8');
const entryFile = entry => path.join(dist, `${entry}.js`);
const scriptKind = file => file.endsWith('.tsx') ? ts.ScriptKind.TSX : file.endsWith('.ts') ? ts.ScriptKind.TS : file.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.JS;

// Runtime dependencies and directive of a module, from its TypeScript AST: type-only imports and
// re-exports are erased by the compiler and do not count; comments and string contents are never read
// as imports. Static, side-effect and dynamic imports, value re-exports and require() calls count.
const moduleCache = new Map();
function moduleInfo(file) {
  if (moduleCache.has(file)) return moduleCache.get(file);
  const sourceFile = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, scriptKind(file));
  const specifiers = [];
  const literal = node => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
  const visit = node => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const typeOnly = clause && (clause.isTypeOnly || (!clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings)
        && clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every(element => element.isTypeOnly)));
      if (!typeOnly) specifiers.push(literal(node.moduleSpecifier));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const typeOnly = node.isTypeOnly || (node.exportClause && ts.isNamedExports(node.exportClause)
        && node.exportClause.elements.length > 0 && node.exportClause.elements.every(element => element.isTypeOnly));
      if (!typeOnly) specifiers.push(literal(node.moduleSpecifier));
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
      || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      specifiers.push(literal(node.arguments[0]));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const directives = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    directives.push(statement.expression.text);
  }
  const info = { specifiers: specifiers.filter(Boolean), client: directives.includes('use client') };
  moduleCache.set(file, info);
  return info;
}
const isClientEntry = entry => fs.existsSync(entryFile(entry)) && moduleInfo(entryFile(entry)).client;

function libEntries() {
  const exportsMap = JSON.parse(read(path.join(lib, 'package.json'))).exports;
  return Object.keys(exportsMap).filter(key => /^\.\/[a-z-]+$/.test(key)).map(key => key.slice(2));
}

// The ESM file of an entry and what it loads, transitively: shared chunks and the other lib entries it
// imports (the react entry imports the published shared and theme entries). Server entries are never
// followed: their code must stay out of the browser whoever imports them.
function reachableFiles(entry) {
  const seen = new Set();
  const visit = file => {
    if (seen.has(file) || !fs.existsSync(file)) return;
    seen.add(file);
    for (const specifier of moduleInfo(file).specifiers) {
      if (specifier.startsWith('./') && specifier.endsWith('.js')) visit(path.join(path.dirname(file), specifier));
      const own = specifier.match(/^@mairie360\/lib-components\/([a-z-]+)$/);
      if (own && !SERVER_ENTRIES.includes(own[1])) visit(entryFile(own[1]));
    }
  };
  visit(entryFile(entry));
  return seen;
}

// Human-readable sentences (messages, labels), which survive minification unchanged. Class lists
// ("text-sm text-[var(--mairie-muted)]") are shared by many entries and the front itself, so a literal
// only counts when most of its words are plain words.
const WORD = /^[A-Za-zÀ-ÿ'’]{3,}$/;
function isSentence(text) {
  if (text.length < MIN_MARKER_LENGTH || /[\\$`[\]{}<>=]/.test(text)) return false;
  const words = text.split(/\s+/).map(word => word.replace(/[.,;:!?…()«»"]+/g, '')).filter(Boolean);
  const plain = words.filter(word => WORD.test(word)).length;
  return plain >= 3 && plain / words.length >= 0.6;
}

// Lib-owned header names (`X-Mairie360-Login-Required`) are as distinctive as a sentence.
const isOwnHeader = text => /^X-Mairie360-[A-Za-z-]+$/.test(text);

// Every string literal of a file, parsed (quotes, escapes such as `\\xE9` and template literals handled by the
// TypeScript parser rather than guessed by a pattern).
const literalCache = new Map();
function stringLiterals(file) {
  if (!literalCache.has(file)) {
    const literals = new Set();
    const visit = node => {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) literals.add(node.text);
      else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) literals.add(node.text);
      ts.forEachChild(node, visit);
    };
    visit(ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, false, ts.ScriptKind.JS));
    literalCache.set(file, literals);
  }
  return literalCache.get(file);
}

function textLiterals(files) {
  const literals = new Set();
  for (const file of files) for (const text of stringLiterals(file)) if (isSentence(text) || isOwnHeader(text)) literals.add(text);
  return literals;
}

// The front's own module graph. Client modules are the 'use client' files and everything they import;
// a lib entry is used by the client when a client module imports it, or when the entry is itself a client
// module (Next.js ships those even when a Server Component renders them).
function frontImports() {
  const resolve = (from, specifier) => {
    const base = specifier.startsWith('@/') ? path.join(src, specifier.slice(2)) : specifier.startsWith('.') ? path.resolve(path.dirname(from), specifier) : undefined;
    if (!base) return undefined;
    return [base, ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].flatMap(ext => [base + ext, path.join(base, 'index' + ext)])]
      .find(file => SOURCE.test(file) && fs.existsSync(file) && fs.statSync(file).isFile());
  };
  const modules = new Map(filesBelow(src, file => SOURCE.test(file)).map(file => {
    const { specifiers, client } = moduleInfo(file);
    return [file, { source: read(file), client, specifiers, local: specifiers.map(specifier => resolve(file, specifier)).filter(Boolean) }];
  }));
  const clientModules = new Set();
  const markClient = file => {
    if (clientModules.has(file) || !modules.has(file)) return;
    clientModules.add(file);
    modules.get(file).local.forEach(markClient);
  };
  for (const [file, module] of modules) if (module.client) markClient(file);
  const rootImports = [], clientUsed = new Set();
  for (const [file, module] of modules) {
    for (const specifier of module.specifiers) {
      const match = specifier.match(/^@mairie360\/lib-components(?:\/([a-z-]+))?$/);
      if (!match) continue;
      if (!match[1]) rootImports.push(path.relative(root, file));
      else if (clientModules.has(file) || isClientEntry(match[1])) clientUsed.add(match[1]);
    }
  }
  // Only client code reaches the browser: text in the front's server modules does not hide a leak.
  const clientSourceText = [...clientModules].map(file => modules.get(file).source).join('\n');
  return { rootImports, clientUsed, clientSourceText };
}

test('MAIR-126: the front imports lib subpaths only, never the root entry', () => {
  assert.deepEqual(frontImports().rootImports, []);
});

test('MAIR-126: the client build ships no lib entry its client code does not use, and no lib server code', t => {
  const clientFiles = filesBelow(clientDir, file => file.endsWith('.js'));
  assert.ok(clientFiles.length > 0, 'Run `npm run build` first: no client JavaScript in .next/static');
  // Markers are searched inside the parsed client literals: a minifier may fold a sentence into a longer one.
  const client = clientFiles.flatMap(file => [...stringLiterals(file)]).join('\u0000');
  const { clientUsed, clientSourceText } = frontImports();
  const usedFiles = new Set([...clientUsed].filter(entry => !SERVER_ENTRIES.includes(entry)).flatMap(entry => [...reachableFiles(entry)]));
  const usedLiterals = textLiterals(usedFiles);
  const forbidden = libEntries().filter(entry => SERVER_ENTRIES.includes(entry) || !usedFiles.has(entryFile(entry)));
  const leaks = [], unprovable = [];
  for (const entry of forbidden) {
    // Text also present in a client entry in use, or in this front's own client code, proves nothing.
    const markers = [...textLiterals(reachableFiles(entry))].filter(text => !usedLiterals.has(text) && !clientSourceText.includes(text));
    t.diagnostic(`${entry}: ${markers.length} distinctive sentences`);
    if (markers.length === 0) { unprovable.push(entry); continue; }
    const found = markers.filter(text => client.includes(text));
    if (found.length) leaks.push(`${entry}: ${found.slice(0, 3).map(text => JSON.stringify(text)).join(', ')}`);
  }
  const mapped = verifyClientSourceMaps({ clientFiles, usedFiles, libRoot: lib,
    forbidden: new Map(forbidden.map(entry => [entry, reachableFiles(entry)])) });
  for (const entry of unprovable) t.diagnostic(`${entry}: ${mapped.get(entry)} distinct mapped source identities checked`);
  assert.deepEqual(unprovable.filter(entry => !mapped.has(entry)), [], 'neither strings nor mapped source identities prove these lib entries absent');
  assert.deepEqual(leaks, [], 'lib code this front does not use on the client (or lib server code) reached the browser bundle');
});
