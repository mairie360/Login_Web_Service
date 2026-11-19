const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { POST: options } = requireTs('src/app/api/auth/passkey/setup/options/route.ts');
const { POST: setup } = requireTs('src/app/api/auth/passkey/setup/route.ts');
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
const COOKIE = `twoFactorSetupToken=${TOKEN}`;
const optionsRequest = (cookie = COOKIE) => new NextRequest('http://localhost/api/auth/passkey/setup/options', { method: 'POST', headers: { 'Sec-Fetch-Site': 'same-origin', ...(cookie ? { cookie } : {}) } });
const setupRequest = (body, cookie = COOKIE) => new NextRequest('http://localhost/api/auth/passkey/setup', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin', ...(cookie ? { cookie } : {}) }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const CREDENTIAL = { id: 'cred', rawId: 'AQ', type: 'public-key', response: { attestationObject: 'Ag', clientDataJSON: 'Aw' } };
const bffError = (status, path, extra = {}) => Response.json({ error: { code: 'X', message: 'x', details: path ? [{ path, message: 'x' }] : [] } }, { status, ...extra });
const session = () => new Response(JSON.stringify({}), { status: 200, headers: new Headers([['content-type', 'application/json'], ['set-cookie', 'accessToken=access-fixture; Path=/; Max-Age=900; HttpOnly'], ['set-cookie', 'refreshToken=refresh-fixture; Path=/; Max-Age=86400; HttpOnly']]) });

test('MAIR-809 passkey setup options: the enrolment token of the cookie goes to the BFF, only the options come back', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url: String(url), body: JSON.parse(init.body) }; return Response.json({ options: { publicKey: { challenge: 'AQID' } }, extra: 'dropped' }); };
  const result = await options(optionsRequest());
  assert.equal(sent.url, 'http://bff.example/auth/passkey/setup/options');
  assert.deepEqual(sent.body, { token: TOKEN });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { options: { publicKey: { challenge: 'AQID' } } });
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.cookies.get('twoFactorSetupToken'), undefined, 'the token stays for the answer');
});

test('MAIR-809 passkey setup options: no cookie or a token that is over sends the agent back to the password', async () => {
  let called = false;
  global.fetch = async () => { called = true; return bffError(401, 'body.token'); };
  const none = await options(optionsRequest(''));
  assert.deepEqual([none.status, (await none.json()).restartLogin, called], [401, true, false]);
  const over = await options(optionsRequest());
  assert.deepEqual([over.status, (await over.json()).restartLogin, over.cookies.get('twoFactorSetupToken').maxAge], [401, true, 0]);
});

test('MAIR-809 passkey setup options: refusals keep their status with a French message', async () => {
  const table = [[409, 409, true], [403, 403, undefined], [503, 503, undefined], [429, 429, undefined], [500, 500, undefined]];
  for (const [upstream, status, restart] of table) {
    global.fetch = async () => bffError(upstream, undefined, upstream === 429 ? { headers: { 'Retry-After': '7' } } : {});
    const result = await options(optionsRequest());
    const body = await result.json();
    assert.equal(result.status, status);
    assert.equal(body.restartLogin, restart);
    assert.match(body.message, /[éèàç’]|Trop|indisponible/i, `French message for ${upstream}`);
    assert.doesNotMatch(body.message, /Upstream|error/i);
    if (upstream === 429) assert.equal(body.retryAfter, 7);
  }
});

test('MAIR-809 passkey setup options: an answer without options is a 502', async () => {
  global.fetch = async () => Response.json({});
  assert.equal((await options(optionsRequest())).status, 502);
});

test('MAIR-809 passkey setup options: a cross-site request is refused before any call', async () => {
  let called = false;
  global.fetch = async () => { called = true; return Response.json({}); };
  const result = await options(new NextRequest('http://localhost/api/auth/passkey/setup/options', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site', cookie: COOKIE } }));
  assert.ok(result.status >= 400);
  assert.equal(called, false);
});

test('MAIR-809 passkey setup: token, name and browser answer go to the BFF, the session opens in cookies and the token is forgotten', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url: String(url), body: JSON.parse(init.body) }; return session(); };
  const result = await setup(setupRequest({ label: '  Ordinateur du bureau ', credential: CREDENTIAL }));
  assert.equal(sent.url, 'http://bff.example/auth/passkey/setup');
  assert.deepEqual(sent.body, { token: TOKEN, label: 'Ordinateur du bureau', credential: CREDENTIAL });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { success: true });
  assert.equal(result.cookies.get('accessToken').value, 'access-fixture');
  assert.equal(result.cookies.get('refreshToken').value, 'refresh-fixture');
  assert.equal(result.cookies.get('twoFactorSetupToken').maxAge, 0);
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('MAIR-809 passkey setup: a body that is not an object, a missing or oversized name, or a missing credential never reach the BFF', async () => {
  let called = false;
  global.fetch = async () => { called = true; return session(); };
  const bodies = ['null', '[]', '{', { credential: CREDENTIAL }, { label: '   ', credential: CREDENTIAL }, { label: 'x'.repeat(101), credential: CREDENTIAL }, { label: 'ok' }, { label: 'ok', credential: [] }, { label: 7, credential: CREDENTIAL }];
  for (const body of bodies) assert.equal((await setup(setupRequest(body))).status, 400, JSON.stringify(body));
  assert.equal(called, false);
  assert.equal((await setup(setupRequest({ label: 'x'.repeat(100), credential: CREDENTIAL }))).status, 200, '100 characters is the limit');
});

test('MAIR-809 passkey setup: no cookie, a token over (401 body.token, 404) or an account already secured (409) restart the sign-in', async () => {
  global.fetch = async () => session();
  const none = await setup(setupRequest({ label: 'a', credential: CREDENTIAL }, ''));
  assert.deepEqual([none.status, (await none.json()).restartLogin], [401, true]);
  for (const [upstream, status] of [[401, 401], [404, 401], [409, 409]]) {
    global.fetch = async () => bffError(upstream, upstream === 401 ? 'body.token' : undefined);
    const result = await setup(setupRequest({ label: 'a', credential: CREDENTIAL }));
    assert.deepEqual([result.status, (await result.json()).restartLogin, result.cookies.get('twoFactorSetupToken').maxAge], [status, true, 0], String(upstream));
  }
});

test('MAIR-809 passkey setup: a refused browser answer keeps the token usable; 403, 429 and 5xx map to French messages', async () => {
  global.fetch = async () => bffError(400);
  const refused = await setup(setupRequest({ label: 'a', credential: CREDENTIAL }));
  const refusedBody = await refused.json();
  assert.deepEqual([refused.status, refusedBody.reason, refusedBody.restartLogin, refused.cookies.get('twoFactorSetupToken')], [400, 'refused', undefined, undefined]);
  global.fetch = async () => bffError(401);
  const other = await setup(setupRequest({ label: 'a', credential: CREDENTIAL }));
  assert.deepEqual([other.status, (await other.json()).restartLogin], [401, undefined]);
  global.fetch = async () => bffError(403);
  assert.equal((await (await setup(setupRequest({ label: 'a', credential: CREDENTIAL }))).json()).reason, 'not-accepted');
  global.fetch = async () => bffError(429, undefined, { headers: { 'Retry-After': '9' } });
  const limited = await setup(setupRequest({ label: 'a', credential: CREDENTIAL }));
  assert.deepEqual([limited.status, (await limited.json()).retryAfter], [429, 9]);
  global.fetch = async () => bffError(500);
  const down = await setup(setupRequest({ label: 'a', credential: CREDENTIAL }));
  assert.equal(down.status, 500);
  assert.doesNotMatch((await down.json()).message, /Upstream|error/i);
});

test('MAIR-809 passkey setup: an answer with no session cookies is a 502 and opens nothing', async () => {
  global.fetch = async () => Response.json({});
  const result = await setup(setupRequest({ label: 'a', credential: CREDENTIAL }));
  assert.equal(result.status, 502);
  assert.equal(result.cookies.get('accessToken'), undefined);
});

test('MAIR-809 passkey setup: an unreachable BFF is a 502, a timeout a 504', async () => {
  global.fetch = async () => { throw new TypeError('fetch failed'); };
  assert.equal((await setup(setupRequest({ label: 'a', credential: CREDENTIAL }))).status, 502);
  global.fetch = async () => { const e = new Error('t'); e.name = 'TimeoutError'; throw e; };
  assert.equal((await setup(setupRequest({ label: 'a', credential: CREDENTIAL }))).status, 504);
});
