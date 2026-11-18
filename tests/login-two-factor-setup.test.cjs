const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { POST: login } = requireTs('src/app/api/auth/login/route.ts');
const { POST: start } = requireTs('src/app/api/auth/2fa/setup/route.ts');
const { POST: confirm } = requireTs('src/app/api/auth/2fa/confirm/route.ts');
const originalFetch = global.fetch;
const originalBffUrl = process.env.BFF_USER_API_URL;
const originalCookieDomain = process.env.COOKIE_DOMAIN;
beforeEach(() => { process.env.BFF_USER_API_URL = 'http://bff.example'; delete process.env.COOKIE_DOMAIN; });
afterEach(() => {
  global.fetch = originalFetch;
  if (originalBffUrl === undefined) delete process.env.BFF_USER_API_URL; else process.env.BFF_USER_API_URL = originalBffUrl;
  if (originalCookieDomain === undefined) delete process.env.COOKIE_DOMAIN; else process.env.COOKIE_DOMAIN = originalCookieDomain;
});

const TOKEN = 'enrolment-token-fixture';
const headers = (cookie, extra = {}) => ({ 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', ...(cookie ? { cookie } : {}), ...extra });
const loginRequest = () => new NextRequest('http://localhost/api/auth/login', { method: 'POST', headers: headers(), body: JSON.stringify({ email: 'alice@example.test', password: 'fixture-password' }) });
const startRequest = (cookie = `twoFactorSetupToken=${TOKEN}`) => new NextRequest('http://localhost/api/auth/2fa/setup', { method: 'POST', headers: { 'Sec-Fetch-Site': 'same-origin', ...(cookie ? { cookie } : {}) } });
const confirmRequest = (body, cookie = `twoFactorSetupToken=${TOKEN}`) => new NextRequest('http://localhost/api/auth/2fa/confirm', { method: 'POST', headers: headers(cookie), body: JSON.stringify(body) });
const bffError = (status, path, extra = {}) => Response.json({ error: { code: 'UNAUTHORIZED', message: 'x', details: path ? [{ path, message: 'x' }] : [] } }, { status, ...extra });
const CODES = ['YOQM-3Y5S', '2ZXN-64EK', '7KNA-K6CC', 'FDGB-RIMD', 'WQZH-JFBF', 'HTET-ID44', 'K4CD-EDXC', '52CF-QF3J', '73KG-ZKVB', 'YHUI-67QX'];

test('MAIR-809 login: a 202 « 2fa_setup_required » keeps the enrolment token in its own HttpOnly cookie and hands the policy to the screen', async () => {
  global.fetch = async () => Response.json({ status: '2fa_setup_required', token: TOKEN, policy: { totp_allowed: true, passkey_allowed: false, backup_codes_allowed: true } }, { status: 202 });
  const result = await login(loginRequest());
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { requiresTwoFactorSetup: true, policy: { totp: true, passkey: false, backupCodes: true } });
  const cookie = result.cookies.get('twoFactorSetupToken');
  assert.deepEqual({ value: cookie.value, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, path: cookie.path, maxAge: cookie.maxAge }, { value: TOKEN, httpOnly: true, sameSite: 'strict', path: '/api/auth', maxAge: 300 });
  assert.equal(result.cookies.get('twoFactorToken'), undefined, 'the second-step cookie is not used');
  assert.equal(result.cookies.get('accessToken'), undefined);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('MAIR-809 login: a BFF that sends no (or an incomplete) policy still announces the enrolment, without guessing the modes', async () => {
  for (const policy of [undefined, { totp_allowed: true }, 'nope']) {
    global.fetch = async () => Response.json({ status: '2fa_setup_required', token: TOKEN, ...(policy === undefined ? {} : { policy }) }, { status: 202 });
    const result = await login(loginRequest());
    assert.deepEqual(await result.json(), { requiresTwoFactorSetup: true });
    assert.equal(result.cookies.get('twoFactorSetupToken').value, TOKEN);
  }
});

test('MAIR-809 login: the second-step answer is unchanged and sets no enrolment cookie', async () => {
  global.fetch = async () => Response.json({ status: '2fa_required', token: 'login-token-fixture' }, { status: 202 });
  const result = await login(loginRequest());
  assert.deepEqual(await result.json(), { requiresTwoFactor: true });
  assert.equal(result.cookies.get('twoFactorSetupToken'), undefined);
});

test('MAIR-809 setup: the enrolment token of the cookie goes to the BFF, only the secret and the URI come back', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url: String(url), body: JSON.parse(init.body) }; return Response.json({ secret: 'EXAMPLEKEYEXAMPL', otpauth_uri: 'otpauth://totp/Mairie360:a@b.test?secret=EXAMPLEKEYEXAMPL', internal: 'hidden' }); };
  const result = await start(startRequest());
  assert.equal(sent.url, 'http://bff.example/auth/2fa/setup');
  assert.deepEqual(sent.body, { token: TOKEN });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { secret: 'EXAMPLEKEYEXAMPL', otpauthUri: 'otpauth://totp/Mairie360:a@b.test?secret=EXAMPLEKEYEXAMPL' });
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.cookies.get('twoFactorSetupToken'), undefined, 'the token stays for the confirmation');
});

test('MAIR-809 setup: no cookie, or an enrolment token that is over, sends the agent back to the password and forgets the cookie', async () => {
  let called = false;
  global.fetch = async () => { called = true; return Response.json({}); };
  const none = await start(startRequest(''));
  assert.deepEqual([none.status, (await none.json()).restartLogin], [401, true]);
  assert.equal(called, false);

  global.fetch = async () => bffError(401, 'body.token');
  const over = await start(startRequest());
  assert.deepEqual([over.status, (await over.json()).restartLogin], [401, true]);
  assert.equal(over.cookies.get('twoFactorSetupToken').maxAge, 0);
});

test('MAIR-809 setup: a 409 (the account got a factor meanwhile), a 429, an invalid answer and BFF failures', async () => {
  global.fetch = async () => bffError(409);
  const conflict = await start(startRequest());
  assert.deepEqual([conflict.status, await conflict.json()], [409, { message: 'Votre compte est déjà sécurisé.', restartLogin: true }]);

  global.fetch = async () => bffError(429, undefined, { headers: { 'Retry-After': '30' } });
  const limited = await start(startRequest());
  assert.deepEqual([limited.status, limited.headers.get('retry-after'), await limited.json()], [429, '30', { message: 'Trop de tentatives.', retryAfter: 30 }]);

  global.fetch = async () => Response.json({ secret: 'EXAM' });
  assert.equal((await start(startRequest())).status, 502, 'an answer without the URI is refused');

  global.fetch = async () => Response.json({}, { status: 503 });
  const unavailable = await start(startRequest());
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).message, /indisponible/);
  global.fetch = async () => { throw new Error('connection refused'); };
  assert.equal((await start(startRequest())).status, 502);
  delete process.env.BFF_USER_API_URL;
  assert.equal((await start(startRequest())).status, 503);
});

test('MAIR-809 setup: a cross-site call is refused before the BFF', async () => {
  let called = false;
  global.fetch = async () => { called = true; return Response.json({}); };
  const request = new NextRequest('http://localhost/api/auth/2fa/setup', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site', cookie: `twoFactorSetupToken=${TOKEN}` } });
  assert.equal((await start(request)).status, 403);
  assert.equal(called, false);
});

test('MAIR-809 confirm: the code and the cookie token go to the BFF, the session cookies and the backup codes come back', async () => {
  let sent;
  global.fetch = async (url, init) => {
    sent = { url: String(url), body: JSON.parse(init.body) };
    return Response.json({ message: 'Logged in successfully', backup_codes: CODES }, { headers: [['set-cookie', 'accessToken=access-fixture; Path=/; HttpOnly'], ['set-cookie', 'refreshToken=refresh-fixture; Path=/api; HttpOnly']] });
  };
  const result = await confirm(confirmRequest({ code: ' 492039 ' }));
  assert.equal(sent.url, 'http://bff.example/auth/2fa/confirm');
  assert.deepEqual(sent.body, { token: TOKEN, code: '492039' });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { success: true, backupCodes: CODES });
  assert.equal(result.cookies.get('accessToken').value, 'access-fixture');
  assert.equal(result.cookies.get('refreshToken').value, 'refresh-fixture');
  assert.equal(result.cookies.get('twoFactorSetupToken').maxAge, 0, 'the enrolment token is forgotten once used');
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('MAIR-809 confirm: a wrong first code keeps the enrolment token, a token that is over restarts from the password', async () => {
  global.fetch = async () => bffError(401);
  const wrong = await confirm(confirmRequest({ code: '000000' }));
  assert.deepEqual([wrong.status, await wrong.json()], [401, { message: 'Code incorrect.', reason: 'wrong-code' }]);
  assert.equal(wrong.cookies.get('twoFactorSetupToken'), undefined);

  for (const upstream of [bffError(401, 'body.token'), bffError(404)]) {
    global.fetch = async () => upstream;
    const over = await confirm(confirmRequest({ code: '123456' }));
    assert.deepEqual([over.status, (await over.json()).restartLogin], [401, true]);
    assert.equal(over.cookies.get('twoFactorSetupToken').maxAge, 0);
  }
});

test('MAIR-809 confirm: no cookie, a 429, an answer without session or codes, and BFF failures', async () => {
  let called = false;
  global.fetch = async () => { called = true; return Response.json({}); };
  const none = await confirm(confirmRequest({ code: '123456' }, ''));
  assert.deepEqual([none.status, (await none.json()).restartLogin], [401, true]);
  assert.equal(called, false);

  global.fetch = async () => bffError(429, undefined, { headers: { 'Retry-After': '30' } });
  const limited = await confirm(confirmRequest({ code: '123456' }));
  assert.deepEqual([limited.status, (await limited.json()).retryAfter], [429, 30]);

  global.fetch = async () => Response.json({ message: 'ok', backup_codes: CODES });
  assert.equal((await confirm(confirmRequest({ code: '123456' }))).status, 502, 'no session cookies');
  global.fetch = async () => Response.json({ message: 'ok' }, { headers: [['set-cookie', 'accessToken=a; Path=/'], ['set-cookie', 'refreshToken=r; Path=/api']] });
  assert.equal((await confirm(confirmRequest({ code: '123456' }))).status, 502, 'no backup codes');

  global.fetch = async () => Response.json({}, { status: 503 });
  assert.equal((await confirm(confirmRequest({ code: '123456' }))).status, 503);
  global.fetch = async () => { throw new Error('connection refused'); };
  assert.equal((await confirm(confirmRequest({ code: '123456' }))).status, 502);
});

test('MAIR-809 confirm: refuses a missing or oversized code, a cross-site call and a non-JSON call before the BFF', async () => {
  let called = false;
  global.fetch = async () => { called = true; return Response.json({}); };
  assert.equal((await confirm(confirmRequest({}))).status, 400);
  assert.equal((await confirm(confirmRequest({ code: 'x'.repeat(33) }))).status, 400);
  const crossSite = new NextRequest('http://localhost/api/auth/2fa/confirm', { method: 'POST', headers: { ...headers(`twoFactorSetupToken=${TOKEN}`), 'Sec-Fetch-Site': 'cross-site' }, body: '{"code":"123456"}' });
  assert.equal((await confirm(crossSite)).status, 403);
  const notJson = new NextRequest('http://localhost/api/auth/2fa/confirm', { method: 'POST', headers: { 'Content-Type': 'text/plain', 'Sec-Fetch-Site': 'same-origin', cookie: `twoFactorSetupToken=${TOKEN}` }, body: '123456' });
  assert.equal((await confirm(notJson)).status, 415);
  assert.equal(called, false);
});
