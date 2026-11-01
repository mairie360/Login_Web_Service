const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.join(__dirname, '../..');
const parse = file => { const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS); if (source.parseDiagnostics.length) throw new Error(`Invalid TypeScript syntax in ${file}`); return source; };
const nodes = (source, predicate) => { const found = []; const visit = node => { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); }; visit(source); return found; };
const propertyName = node => node && (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) ? node.text : undefined;
const callName = expression => ts.isIdentifier(expression) ? expression.text : ts.isPropertyAccessExpression(expression) ? expression.name.text : ts.isElementAccessExpression(expression) ? propertyName(expression.argumentExpression) : undefined;
const imports = source => nodes(source, node => ts.isImportDeclaration(node) || ts.isExportDeclaration(node)).filter(node => node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier) && !(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly)).map(node => node.moduleSpecifier.text);
const calls = (source, name) => nodes(source, node => ts.isCallExpression(node) && callName(node.expression) === name);
const configuredUrl = node => !!node && ts.isCallExpression(node) && callName(node.expression) === 'configuredBffUrl' && node.arguments.length === 0;
const parameterReference = (node, index = 0) => { if (!node || !ts.isIdentifier(node)) return false; for (let parent = node.parent; parent; parent = parent.parent) { if (ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isArrowFunction(parent) || ts.isMethodDeclaration(parent)) return parent.parameters[index] && ts.isIdentifier(parent.parameters[index].name) && parent.parameters[index].name.text === node.text; } return false; };
const envNames = source => nodes(source, node => (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'process' && node.expression.name.text === 'env').map(node => ts.isPropertyAccessExpression(node) ? node.name.text : propertyName(node.argumentExpression));
const networkReferences = source => {
  const forbidden = ['XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'axios'];
  const names = nodes(source, node => ts.isIdentifier(node) && forbidden.includes(node.text)).map(node => node.text);
  for (const specifier of imports(source)) if (/^(?:node:)?(?:http|https|http2|net|tls|dgram)$|^(?:axios|undici|node-fetch|ky|got)$/.test(specifier)) names.push(`import ${specifier}`);
  return names;
};
const absoluteUrls = source => nodes(source, node => ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)).map(node => ts.isTemplateExpression(node) ? node.head.text : node.text).filter(text => /^https?:\/\//.test(text));
const credentialReferences = source => nodes(source, node => (ts.isIdentifier(node) && node.text === 'sessionStorage')
  || (ts.isCallExpression(node) && ['getItem', 'setItem'].includes(callName(node.expression)) && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) && callName(node.expression.expression) === 'localStorage')
  || (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'document' && node.name.text === 'cookie')
  || (ts.isStringLiteralLike(node) && node.text.toLowerCase() === 'authorization'));
const requestOwners = source => calls(source, 'requestBff').length > 0 || nodes(source, node => ts.isFunctionDeclaration(node) && node.name?.text === 'requestBff').length > 0;
module.exports = { networkReferences, absoluteUrls, credentialReferences, requestOwners, ts, parse, nodes, imports, calls, callName, propertyName, configuredUrl, parameterReference, envNames };
