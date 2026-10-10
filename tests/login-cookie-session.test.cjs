const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const login = requireTs('src/app/api/auth/login/route.ts');
const originalFetch = global.fetch;
const original = Object.fromEntries(['BFF_USER_API_URL', 'NODE_ENV', 'COOKIE_DOMAIN', 'LOGIN_FRONT_URL'].map(key => [key, process.env[key]]));
beforeEach(() => { process.env.BFF_USER_API_URL = 'https://bff.example.test'; process.env.NODE_ENV = 'test'; delete process.env.COOKIE_DOMAIN; delete process.env.LOGIN_FRONT_URL; });
afterEach(() => { global.fetch = originalFetch; for (const [key, value] of Object.entries(original)) value === undefined ? delete process.env[key] : process.env[key] = value; });
const request = () => new NextRequest('https://login.example.test/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ email: 'fixture@example.test', password: 'fixture-password' }) });
const cookieResponse = (cookies, { status = 200, body = { message: 'Signed in' }, authorization } = {}) => {
  const headers = new Headers();
  for (const cookie of cookies) headers.append('set-cookie', cookie);
  if (authorization) headers.set('authorization', authorization);
  return Response.json(body, { status, headers });
};
const access = 'accessToken=cookie-access; Path=/; HttpOnly; SameSite=Strict';
const refresh = 'refreshToken=cookie-refresh; Path=/auth; HttpOnly; SameSite=Strict';

test('cookie-only BFF login creates the existing shared frontend session without exposing any token', async () => {
  process.env.NODE_ENV = 'production'; process.env.COOKIE_DOMAIN = '.mairie.example';
  global.fetch = async () => cookieResponse([access + '; Max-Age=90; Domain=bff.example.test', refresh, 'unrelated=not-a-session; Path=/']);
  const response = await login.POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  const a = response.cookies.get('accessToken'), r = response.cookies.get('refreshToken');
  assert.equal(a.value, 'cookie-access'); assert.equal(r.value, 'cookie-refresh');
  assert.deepEqual({ domain: a.domain, path: a.path, httpOnly: a.httpOnly, secure: a.secure, sameSite: a.sameSite }, { domain: '.mairie.example', path: '/', httpOnly: true, secure: true, sameSite: 'strict' });
  assert.ok(a.maxAge > 0 && a.maxAge <= 90);
  assert.deepEqual({ domain: r.domain, path: r.path, httpOnly: r.httpOnly, secure: r.secure, sameSite: r.sameSite, maxAge: r.maxAge, expires: r.expires }, { domain: '.mairie.example', path: '/api', httpOnly: true, secure: true, sameSite: 'strict', maxAge: undefined, expires: undefined });
  assert.equal(response.cookies.get('unrelated'), undefined); assert.equal(response.headers.get('authorization'), null); assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('the actual cookie pair is authoritative over conflicting legacy response credentials', async () => {
  global.fetch = async () => cookieResponse([access, refresh], { body: { message: 'Signed in', refresh_token: 'legacy-refresh' }, authorization: 'Bearer legacy-access' });
  const response = await login.POST(request()); assert.equal(response.status, 200);
  assert.equal(response.cookies.get('accessToken').value, 'cookie-access'); assert.equal(response.cookies.get('refreshToken').value, 'cookie-refresh');
});
test('cookie JWT expiry remains stricter than the upstream cookie lifetime', async () => {
  const token = `head.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 120 })).toString('base64url')}.signature`;
  global.fetch = async () => cookieResponse([`accessToken=${token}; Path=/; HttpOnly; Max-Age=600`, refresh]);
  const response = await login.POST(request()); assert.equal(response.status, 200); assert.ok(response.cookies.get('accessToken').maxAge > 0 && response.cookies.get('accessToken').maxAge <= 120);
});
test('an upstream absolute expiry also bounds the local access cookie', async () => {
  global.fetch = async () => cookieResponse([access + '; Expires=' + new Date(Date.now() + 45_000).toUTCString(), refresh]);
  const response = await login.POST(request()); assert.equal(response.status, 200); assert.ok(response.cookies.get('accessToken').maxAge > 0 && response.cookies.get('accessToken').maxAge <= 45);
});
test('percent-encoded cookie values are decoded once before the frontend sets its own scopes', async () => {
  global.fetch = async () => cookieResponse(['accessToken=cookie%2Baccess; Path=/; HttpOnly', refresh]);
  const response = await login.POST(request()); assert.equal(response.status, 200); assert.equal(response.cookies.get('accessToken').value, 'cookie+access');
});
for (const body of [null, '', {}, { message: 123 }, { message: null }]) test('a malformed cookie-only session response body cannot open a session: ' + JSON.stringify(body), async () => {
  global.fetch = async () => cookieResponse([access, refresh], { body });
  const response = await login.POST(request()); assert.equal(response.status, 502); assert.equal(response.headers.get('set-cookie'), null);
});
for (const [name, cookies] of [
  ['missing refresh', [access]], ['missing access', [refresh]],
  ['deleted access', ['accessToken=; Max-Age=0; Path=/', refresh]],
  ['expired refresh', [access, refresh + '; Expires=Thu, 01 Jan 1970 00:00:00 GMT']],
  ['expired access', [access + '; Max-Age=0', refresh]],
  ['invalid lifetime', [access + '; Max-Age=invalid', refresh]],
  ['invalid expiry', [access + '; Expires=invalid', refresh]],
  ['overflowing lifetime', [access + '; Max-Age=' + '9'.repeat(400), refresh]],
  ['duplicate access', [access, access.replace('cookie-access', 'other-access'), refresh]],
  ['duplicate refresh', [access, refresh, refresh.replace('cookie-refresh', 'other-refresh')]],
  ['control characters', ['accessToken=cookie%0Aaccess; Path=/; HttpOnly', refresh]],
  ['whitespace', ['accessToken=cookie%20access; Path=/; HttpOnly', refresh]],
  ['malformed refresh', [access, 'refreshToken=cookie%0Arefresh; Path=/auth; HttpOnly']],
]) test(name + ' cookie session never falls back to legacy credentials or opens a partial session', async () => {
  global.fetch = async () => cookieResponse(cookies, { body: { refresh_token: 'legacy-refresh' }, authorization: 'Bearer legacy-access' });
  const response = await login.POST(request()); assert.equal(response.status, 502); assert.equal(response.headers.get('set-cookie'), null); assert.doesNotMatch(JSON.stringify(await response.json()), /cookie-access|cookie-refresh|legacy-access|legacy-refresh/);
});
for (const name of ['accessToken', 'refreshToken']) test(name + ' with less than a full second left cannot open a zero-lifetime session', async () => {
  const realNow = Date.now;
  const boundary = Date.UTC(2040, 0, 1, 0, 0, 1);
  try {
    Date.now = () => boundary - 100;
    const cookies = [name === 'accessToken' ? access + '; Expires=' + new Date(boundary).toUTCString() : access, name === 'refreshToken' ? refresh + '; Expires=' + new Date(boundary).toUTCString() : refresh];
    global.fetch = async () => cookieResponse(cookies);
    const response = await login.POST(request()); assert.equal(response.status, 502); assert.equal(response.headers.get('set-cookie'), null);
  } finally { Date.now = realNow; }
});
test('an expired cookie JWT cannot open a session even with a live cookie attribute', async () => {
  const token = `head.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 })).toString('base64url')}.signature`;
  global.fetch = async () => cookieResponse([`accessToken=${token}; Path=/; Max-Age=600; HttpOnly`, refresh]);
  const response = await login.POST(request()); assert.equal(response.status, 502); assert.equal(response.headers.get('set-cookie'), null);
});
test('an unrelated BFF cookie does not prevent the existing published Bearer/body protocol', async () => {
  global.fetch = async () => cookieResponse(['unrelated=not-a-session; Path=/'], { body: { refresh_token: 'legacy-refresh' }, authorization: 'Bearer legacy-access' });
  const response = await login.POST(request()); assert.equal(response.status, 200); assert.equal(response.cookies.get('accessToken').value, 'legacy-access'); assert.equal(response.cookies.get('refreshToken').value, 'legacy-refresh'); assert.equal(response.cookies.get('unrelated'), undefined);
});
for (const status of [400, 401, 403, 500]) test(status + ' BFF refusal does not forward a cookie session', async () => {
  global.fetch = async () => cookieResponse([access, refresh], { status });
  const response = await login.POST(request()); assert.equal(response.status, status); assert.equal(response.headers.get('set-cookie'), null);
});
test('first connection keeps its one-time-token flow and ignores premature session cookies', async () => {
  global.fetch = async () => cookieResponse([access, refresh], { status: 412, body: { token: 'one-time-token' } });
  const response = await login.POST(request()); assert.equal(response.status, 200); assert.equal((await response.json()).requiresPasswordChange, true); assert.equal(response.cookies.get('passwordChangeToken').value, 'one-time-token'); assert.equal(response.cookies.get('accessToken'), undefined); assert.equal(response.cookies.get('refreshToken'), undefined);
});
