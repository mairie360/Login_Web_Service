const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');

const { configuredBffUrl } = requireTs('src/lib/bff-user.ts');
const { proxyBffRequest } = requireTs('src/lib/bff-proxy.ts');
const login = requireTs('src/app/api/auth/login/route.ts');
const changePassword = requireTs('src/app/api/auth/force-change-password/route.ts');
const originalFetch = global.fetch;
const originalUrls = { BFF_USER_API_URL: process.env.BFF_USER_API_URL, USER_BFF_URL: process.env.USER_BFF_URL };

afterEach(() => {
  global.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalUrls)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

const loginRequest = () => new NextRequest('http://localhost/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'alice@example.test', password: 'fixture-password' }),
});
const changeRequest = () => new NextRequest('http://localhost/api/auth/force-change-password', {
  method: 'POST', headers: { 'Content-Type': 'application/json', cookie: 'passwordChangeToken=fixture-token' },
  body: JSON.stringify({ newPassword: 'fixture-password-new' }),
});

for (const [name, value] of [
  ['missing', undefined],
  ['empty', ''],
  ['malformed', 'not-a-url'],
  ['unsupported protocol', 'file:///tmp/bff'],
  ['embedded credentials', 'http://user:password@example.test'],
  ['query string', 'http://bff.example?token=example'],
  ['fragment', 'http://bff.example#fragment'],
]) {
  test(`${name} User BFF URL returns uncached 503 from every Login relay without an upstream call`, async () => {
    delete process.env.BFF_USER_API_URL;
    delete process.env.USER_BFF_URL;
    if (value !== undefined) process.env.BFF_USER_API_URL = value;
    global.fetch = async () => { throw new Error('must not be called'); };

    assert.equal(configuredBffUrl(), '');
    const responses = [
      await proxyBffRequest(new NextRequest('http://localhost/health'), { params: Promise.resolve({ path: ['health'] }) }),
      await login.POST(loginRequest()),
      await changePassword.POST(changeRequest()),
    ];
    for (const response of responses) {
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.ok(await response.json());
    }
  });
}
