const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const policy = require('./support/source-policy.cjs');
const { requireTs } = require('./support/load-ts.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');

// Inventaire statique de tous les appels réseau du code source (serveur et navigateur). Chaque appel
// doit être vérifiable contre le contrat du BFF :
// - côté serveur, `fetch(bffUserUrl('/chemin'), { method })` vers une opération déclarée : BFF User est
//   le seul BFF, et src/lib/bff-user.ts le seul endroit qui connaît son URL ;
// - côté navigateur, `fetch('/chemin', { method })` same-origin vers un route handler de src/app/api
//   (lui-même inventorié ici) ou vers une opération du contrat (relayée par le proxy) ;
// - le proxy commun publié porte le seul transport générique, borné aux chemins du contrat.
// Tout autre appel (URL absolue, construite, autre API réseau) fait échouer le test.

const ROOT = path.join(__dirname, '..');
const contract = OpenApiContract.load(path.join(ROOT, 'contracts', 'openapi.json'));
const PROXY_FILE = 'src/lib/bff-proxy.ts';
const FORBIDDEN_CALLS = new Set(['XMLHttpRequest', 'EventSource', 'WebSocket', 'sendBeacon', 'axios']);
const FORBIDDEN_MODULES = /^(node:)?(http|https|net|tls|http2|dgram)$|^(axios|undici|node-fetch|ky|got)$/;

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [full] : [];
  });
}

const calleePath = expression => {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) {
    const owner = calleePath(expression.expression);
    return owner ? `${owner}.${expression.name.text}` : undefined;
  }
  return undefined;
};

function scan() {
  const calls = [];
  const forbidden = [];
  for (const file of sourceFiles(path.join(ROOT, 'src'))) {
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && FORBIDDEN_MODULES.test(node.moduleSpecifier.text)) {
        forbidden.push(`${relative}: import ${node.moduleSpecifier.text}`);
      }
      if (ts.isIdentifier(node) && FORBIDDEN_CALLS.has(node.text)) forbidden.push(`${relative}: ${node.text}`);
      if (ts.isCallExpression(node)) {
        const callee = node.expression.kind === ts.SyntaxKind.ImportKeyword ? 'import' : calleePath(node.expression);
        if (callee === 'require' || callee === 'import') {
          const [specifier] = node.arguments;
          if (specifier && ts.isStringLiteralLike(specifier) && FORBIDDEN_MODULES.test(specifier.text)) forbidden.push(`${relative}: require ${specifier.text}`);
        }
        if (['fetch', 'window.fetch', 'globalThis.fetch', 'global.fetch', 'self.fetch'].includes(callee)) calls.push(describeCall(relative, source, node));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { calls, forbidden };
}

function describeCall(file, source, node) {
  const [target, init] = node.arguments;
  let method = 'GET';
  if (init && ts.isObjectLiteralExpression(init)) {
    const property = init.properties.find((candidate) => policy.propertyName(candidate.name) === 'method');
    if (property) method = ts.isPropertyAssignment(property) && ts.isStringLiteralLike(property.initializer) ? property.initializer.text.toUpperCase() : null;
  } else if (init) {
    method = null;
  }
  const where = `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
  if (target && ts.isStringLiteralLike(target)) return { where, file, kind: 'same-origin', url: target.text, method };
  if (target && ts.isCallExpression(target) && ts.isIdentifier(target.expression) && target.expression.text === 'bffUserUrl'
    && target.arguments.length === 1 && ts.isStringLiteralLike(target.arguments[0])) {
    return { where, file, kind: 'bff', url: target.arguments[0].text, method };
  }
  return { where, file, kind: 'dynamic', url: target?.getText(source), method };
}

/** Route handler App Router servant un chemin same-origin (segments dynamiques non gérés : aucun n'est appelé). */
function routeHandlerFile(pathname) {
  const file = path.join(ROOT, 'src', 'app', ...pathname.split('/').filter(Boolean), 'route.ts');
  return fs.existsSync(file) ? path.relative(ROOT, file).split(path.sep).join('/') : undefined;
}

const { calls, forbidden } = scan();

test('no network API other than fetch is used in src/', () => {
  assert.deepEqual(forbidden, []);
});

test('every fetch call is a verifiable call: BFF operation, same-origin route, or the contract-gated proxy', () => {
  // Le transport générique appartient au paquet publié ; tous les fetch locaux restent littéraux.
  const unverifiable = calls.filter((call) => call.kind === 'dynamic' || call.method === null);
  assert.deepEqual(unverifiable.map(({ where, url }) => `${where} fetch(${url})`), []);
  assert.equal(calls.filter((call) => call.kind === 'dynamic').length, 0, 'generic forwarding belongs to the published server entry');
});

test('server-side BFF calls go through bffUserUrl to operations declared in the BFF User contract', () => {
  const serverCalls = calls.filter((call) => call.kind === 'bff');
  assert.ok(serverCalls.length > 0);
  for (const call of serverCalls) {
    assert.ok(contract.match(call.method, call.url), `${call.where}: ${call.method} ${call.url} absent du contrat ${contract.title}`);
    assert.ok(!call.file.startsWith('src/components/'), `${call.where}: appel au BFF depuis un composant navigateur`);
  }
  assert.deepEqual(serverCalls.map(({ file, method, url }) => `${file} ${method} ${url}`).sort(), [
    'src/app/api/auth/force-change-password/route.ts POST /auth/force_change_password',
    'src/app/api/auth/login/route.ts POST /auth/login',
  ]);
});

test('browser calls stay same-origin and land on an existing route handler or a proxied contract operation', () => {
  const browserCalls = calls.filter((call) => call.kind === 'same-origin');
  assert.ok(browserCalls.length > 0);
  for (const call of browserCalls) {
    const url = new URL(call.url, 'http://front.invalid');
    assert.equal(url.origin, 'http://front.invalid', `${call.where}: ${call.url} n'est pas same-origin`);
    const handlerFile = routeHandlerFile(url.pathname);
    if (handlerFile) {
      assert.equal(typeof requireTs(handlerFile)[call.method], 'function', `${call.where}: ${handlerFile} n'exporte pas ${call.method}`);
    } else {
      assert.ok(contract.match(call.method, url.pathname), `${call.where}: ${call.method} ${url.pathname} n'est ni un route handler ni une opération du contrat`);
    }
  }
  assert.deepEqual(browserCalls.map(({ file, method, url }) => `${file} ${method} ${url}`).sort(), [
    'src/components/Login.tsx POST /api/auth/force_change_password',
    'src/components/Login.tsx POST /api/auth/login',
    'src/components/Logout.tsx POST /api/auth/logout',
  ]);
});

test('BFF User is the only BFF: one URL module, and the proxy forwards to it', () => {
  const bffEnvironment = new Map();
  for (const file of sourceFiles(path.join(ROOT, 'src'))) {
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    for (const name of policy.envNames(policy.parse(relative)).filter(name => typeof name === 'string' && name.includes('BFF'))) {
      bffEnvironment.set(`${relative} ${name}`, true);
    }
  }
  assert.deepEqual([...bffEnvironment.keys()].sort(), ['src/lib/bff-user.ts BFF_USER_API_URL', 'src/lib/bff-user.ts USER_BFF_URL']);
  const source = policy.parse(PROXY_FILE);
  const forwards = policy.calls(source, 'proxyPublishedBffRequest');
  assert.equal(forwards.length, 1);
  assert.ok(policy.parameterReference(forwards[0].arguments[0]));
  const config = forwards[0].arguments[2];
  assert.ok(ts.isObjectLiteralExpression(config));
  const properties = new Map(config.properties.filter(ts.isPropertyAssignment).map(p => [policy.propertyName(p.name), p.initializer.getText(source)]));
  assert.equal(properties.get('baseUrl'), 'configuredBffUrl');
  assert.equal(properties.get('paths'), 'contract.paths');
  assert.equal(properties.get('trustedHeaders'), 'trustedClientIpHeaders');
  assert.match(properties.get('loginUrl'), /process\.env\.LOGIN_FRONT_URL/);
  assert.match(properties.get('frontUrl'), /process\.env\.LOGIN_FRONT_URL/);
  assert.match(fs.readFileSync(path.join(ROOT, PROXY_FILE), 'utf8'), /from '@mairie360\/lib-components\/next'/);
  const proxy = requireTs(PROXY_FILE).proxyBffRequest;
  for (const file of ['src/app/[...path]/route.ts','src/app/api/bff/[...path]/route.ts']) {
    const exports = requireTs(file);
    for (const method of [...new Set(contract.operations().map(x => x.method)), 'HEAD']) assert.equal(exports[method], proxy);
  }
  assert.equal(requireTs(PROXY_FILE).configuredBffUrl, requireTs('src/lib/bff-user.ts').configuredBffUrl);
});

test('Next.js config adds no rewrite or redirect that would bypass the contract-gated proxy', () => {
  const nextConfig = requireTs('next.config.ts').default;
  assert.equal(nextConfig.rewrites, undefined);
  assert.equal(nextConfig.redirects, undefined);
});
