const assert = require('node:assert/strict');
const { test } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { middleware } = requireTs('src/middleware.ts');
const { buildContentSecurityPolicy } = require('@mairie360/front-kit/shared');
const nextConfig = requireTs('next.config.ts').default;

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


test('recovery pages prevent query-token referrer leakage and caching', () => {
  for (const pathname of ['/reset-password?token=disposable-token', '/forgot-password']) {
    const response = middleware(new NextRequest('https://login.example.test' + pathname));
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch([...response.headers].map(String).join(' '), /disposable-token/);
  }
});
