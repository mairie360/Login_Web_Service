const assert = require('node:assert/strict');
const { after, test } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');

const { POST } = requireTs('src/app/api/auth/logout/route.ts');
const originalDomain = process.env.COOKIE_DOMAIN;
const originalNodeEnv = process.env.NODE_ENV;

after(() => {
  if (originalDomain === undefined) delete process.env.COOKIE_DOMAIN;
  else process.env.COOKIE_DOMAIN = originalDomain;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

const request = (headers = {}) => new NextRequest('https://login.dev.mairie360-eip.fr/api/auth/logout', {
  method: 'POST', headers,
});

test('Login expires both shared session cookies with their original domain and paths', () => {
  process.env.COOKIE_DOMAIN = '.dev.mairie360-eip.fr';
  const response = POST(request({ origin: 'https://login.dev.mairie360-eip.fr', 'sec-fetch-site': 'same-origin' }));

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const cookie = response.cookies.get('accessToken');
  assert.deepEqual({ value: cookie.value, domain: cookie.domain, path: cookie.path, maxAge: cookie.maxAge, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite }, {
    value: '', domain: '.dev.mairie360-eip.fr', path: '/', maxAge: 0, httpOnly: true, sameSite: 'strict',
  });
  const refreshCookie = response.cookies.get('refreshToken');
  assert.deepEqual({ value: refreshCookie.value, domain: refreshCookie.domain, path: refreshCookie.path, maxAge: refreshCookie.maxAge, httpOnly: refreshCookie.httpOnly, sameSite: refreshCookie.sameSite }, {
    value: '', domain: '.dev.mairie360-eip.fr', path: '/api', maxAge: 0, httpOnly: true, sameSite: 'strict',
  });
});

test('a cross-site or mismatched-origin request cannot clear the cookie', () => {
  process.env.COOKIE_DOMAIN = '.dev.mairie360-eip.fr';
  for (const headers of [
    { 'sec-fetch-site': 'cross-site' },
    { origin: 'https://untrusted.example' },
    { origin: 'https://login.dev.mairie360-eip.fr', 'sec-fetch-site': 'same-site' },
  ]) {
    const response = POST(request(headers));
    assert.equal(response.status, 403);
    assert.equal(response.cookies.get('accessToken'), undefined);
    assert.equal(response.cookies.get('refreshToken'), undefined);
  }
});

test('production clears the refresh cookie with Secure on the configured domain', () => {
  process.env.NODE_ENV = 'production';
  process.env.COOKIE_DOMAIN = '.dev.mairie360-eip.fr';
  const response = POST(request({ origin: 'https://login.dev.mairie360-eip.fr', 'sec-fetch-site': 'same-origin' }));
  assert.equal(response.status, 204);
  assert.equal(response.cookies.get('refreshToken').secure, true);
  assert.equal(response.cookies.get('refreshToken').domain, '.dev.mairie360-eip.fr');
  assert.equal(response.cookies.get('refreshToken').path, '/api');
});

test('production fails closed if the shared cookie domain is unavailable', () => {
  process.env.NODE_ENV = 'production';
  delete process.env.COOKIE_DOMAIN;
  const response = POST(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.cookies.get('accessToken'), undefined);
  assert.equal(response.cookies.get('refreshToken'), undefined);
});
