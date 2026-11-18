const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { POST: login } = requireTs('src/app/api/auth/login/route.ts');
const { POST: secondStep } = requireTs('src/app/api/auth/login/2fa/route.ts');
const originalFetch = global.fetch;
const originalBffUrl = process.env.BFF_USER_API_URL;
const originalCookieDomain = process.env.COOKIE_DOMAIN;
beforeEach(() => { process.env.BFF_USER_API_URL = 'http://bff.example'; delete process.env.COOKIE_DOMAIN; });
afterEach(() => {
  global.fetch = originalFetch;
  if (originalBffUrl === undefined) delete process.env.BFF_USER_API_URL; else process.env.BFF_USER_API_URL = originalBffUrl;
  if (originalCookieDomain === undefined) delete process.env.COOKIE_DOMAIN; else process.env.COOKIE_DOMAIN = originalCookieDomain;
});

const headers = (cookie) => ({ 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', ...(cookie ? { cookie } : {}) });
const loginRequest = () => new NextRequest('http://localhost/api/auth/login', { method: 'POST', headers: headers(), body: JSON.stringify({ email: 'alice@example.test', password: 'fixture-password' }) });
const stepRequest = (body, cookie = 'twoFactorToken=login-token-fixture') => new NextRequest('http://localhost/api/auth/login/2fa', { method: 'POST', headers: headers(cookie), body: JSON.stringify(body) });
const bffError = (status, path, extra = {}) => Response.json({ error: { code: 'UNAUTHORIZED', message: 'x', details: path ? [{ path, message: 'x' }] : [] } }, { status, ...extra });

test('MAIR-806 login: a 202 « 2fa_required » keeps the login token in an HttpOnly cookie and opens no session', async () => {
  global.fetch = async () => Response.json({ status: '2fa_required', token: 'login-token-fixture' }, { status: 202 });
  const result = await login(loginRequest());
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { requiresTwoFactor: true });
  const cookie = result.cookies.get('twoFactorToken');
  assert.deepEqual({ value: cookie.value, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, path: cookie.path, maxAge: cookie.maxAge }, { value: 'login-token-fixture', httpOnly: true, sameSite: 'strict', path: '/api/auth', maxAge: 300 });
  assert.equal(result.cookies.get('accessToken'), undefined);
  assert.equal(result.cookies.get('refreshToken'), undefined);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('MAIR-806 second step: the code and the cookie token go to the BFF, the session cookies come back', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url: String(url), body: JSON.parse(init.body) }; return Response.json({ message: 'Logged in successfully' }, { headers: [['set-cookie', 'accessToken=access-fixture; Path=/; HttpOnly'], ['set-cookie', 'refreshToken=refresh-fixture; Path=/api; HttpOnly']] }); };
  const result = await secondStep(stepRequest({ code: ' 492039 ' }));
  assert.equal(sent.url, 'http://bff.example/auth/login/2fa');
  assert.deepEqual(sent.body, { token: 'login-token-fixture', code: '492039' });
  assert.equal(result.status, 200);
  assert.equal(result.cookies.get('accessToken').value, 'access-fixture');
  assert.equal(result.cookies.get('refreshToken').value, 'refresh-fixture');
  assert.equal(result.cookies.get('twoFactorToken').maxAge, 0, 'the login token is forgotten once used');
});

test('MAIR-806 second step: a wrong code is a 401 « wrong-code » that keeps the login token', async () => {
  global.fetch = async () => bffError(401);
  const result = await secondStep(stepRequest({ code: '000000' }));
  assert.equal(result.status, 401);
  assert.deepEqual(await result.json(), { message: 'Code incorrect.', reason: 'wrong-code' });
  assert.equal(result.cookies.get('twoFactorToken'), undefined);
});

test('MAIR-806 second step: a spent backup code is told apart', async () => {
  global.fetch = async () => bffError(401, 'body.code');
  const result = await secondStep(stepRequest({ code: 'K3M9-X7PQ' }));
  assert.equal(result.status, 401);
  assert.deepEqual(await result.json(), { message: 'Ce code de secours a déjà été utilisé.', reason: 'spent-backup-code' });
});

test('MAIR-806 second step: a login session that is over clears the cookie and asks to restart', async () => {
  global.fetch = async () => bffError(401, 'body.token');
  const result = await secondStep(stepRequest({ code: '123456' }));
  assert.equal(result.status, 401);
  assert.deepEqual(await result.json(), { message: 'Votre session de connexion a expiré.', restartLogin: true });
  assert.equal(result.cookies.get('twoFactorToken').maxAge, 0);
});

test('MAIR-806 second step: no cookie means the login session is over, without calling the BFF', async () => {
  let called = false;
  global.fetch = async () => { called = true; return Response.json({}); };
  const result = await secondStep(stepRequest({ code: '123456' }, ''));
  assert.equal(result.status, 401);
  assert.equal((await result.json()).restartLogin, true);
  assert.equal(called, false);
});

test('MAIR-806 second step: a 429 gives the Retry-After delay', async () => {
  global.fetch = async () => bffError(429, undefined, { headers: { 'Retry-After': '30' } });
  const result = await secondStep(stepRequest({ code: '123456' }));
  assert.equal(result.status, 429);
  assert.equal(result.headers.get('retry-after'), '30');
  assert.deepEqual(await result.json(), { message: 'Trop de tentatives.', retryAfter: 30 });
});

test('MAIR-806 second step: refuses a missing or oversized code, a cross-site call and a non-JSON call before the BFF', async () => {
  let called = false;
  global.fetch = async () => { called = true; return Response.json({}); };
  assert.equal((await secondStep(stepRequest({}))).status, 400);
  assert.equal((await secondStep(stepRequest({ code: 'x'.repeat(33) }))).status, 400);
  const crossSite = new NextRequest('http://localhost/api/auth/login/2fa', { method: 'POST', headers: { ...headers('twoFactorToken=t'), 'Sec-Fetch-Site': 'cross-site' }, body: '{"code":"123456"}' });
  assert.equal((await secondStep(crossSite)).status, 403);
  const notJson = new NextRequest('http://localhost/api/auth/login/2fa', { method: 'POST', headers: { 'Content-Type': 'text/plain', 'Sec-Fetch-Site': 'same-origin', cookie: 'twoFactorToken=t' }, body: '123456' });
  assert.equal((await secondStep(notJson)).status, 415);
  assert.equal(called, false);
});

test('MAIR-806 second step: BFF failures keep a French message and their status', async () => {
  global.fetch = async () => Response.json({}, { status: 503 });
  const unavailable = await secondStep(stepRequest({ code: '123456' }));
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).message, /indisponible/);
  global.fetch = async () => { throw new Error('connection refused'); };
  assert.equal((await secondStep(stepRequest({ code: '123456' }))).status, 502);
  delete process.env.BFF_USER_API_URL;
  assert.equal((await secondStep(stepRequest({ code: '123456' }))).status, 503);
});
