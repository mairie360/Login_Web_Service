const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const originalLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const { middleware } = require('../src/middleware.ts');
const { buildContentSecurityPolicy } = require('../src/lib/content-security-policy.ts');
const nextConfig = require('../next.config.ts').default;
require.extensions['.ts'] = originalLoader;

const pageRequest = () => new NextRequest('http://localhost:5000/');

test('every page gets a per-request nonce CSP forwarded to Next.js', () => {
  const first = middleware(pageRequest());
  const second = middleware(pageRequest());
  assert.equal(first.status, 200);
  const csp = first.headers.get('content-security-policy');
  const nonce = first.headers.get('x-middleware-request-x-nonce');
  assert.ok(nonce);
  assert.match(csp, new RegExp(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`));
  assert.match(csp, new RegExp(`style-src 'self' 'nonce-${nonce}';`));
  assert.match(csp, /style-src-attr 'unsafe-inline'/);
  assert.match(csp, /form-action 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(first.headers.get('x-middleware-request-content-security-policy'), csp);
  assert.notEqual(second.headers.get('x-middleware-request-x-nonce'), nonce);
});

test('development CSP allows eval for hot reload only', () => {
  assert.doesNotMatch(buildContentSecurityPolicy('n'), /unsafe-eval/);
  assert.match(buildContentSecurityPolicy('n', true), /script-src [^;]*'unsafe-eval'/);
});

test('static security headers apply to every route and X-Powered-By is disabled', async () => {
  assert.equal(nextConfig.poweredByHeader, false);
  const [rule] = await nextConfig.headers();
  assert.equal(rule.source, '/:path*');
  assert.deepEqual(rule.headers.map(({ key }) => key).sort(), ['Cross-Origin-Embedder-Policy', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy', 'Permissions-Policy', 'Referrer-Policy', 'X-Content-Type-Options', 'X-Frame-Options']);
});
