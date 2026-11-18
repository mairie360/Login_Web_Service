const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { POST: passkeyOptions } = requireTs('src/app/api/auth/passkey/options/route.ts');
const { POST: passkey } = requireTs('src/app/api/auth/passkey/route.ts');

const originalFetch = global.fetch;
const originalBffUrl = process.env.BFF_USER_API_URL;
const originalCookieDomain = process.env.COOKIE_DOMAIN;
beforeEach(() => { process.env.BFF_USER_API_URL = 'http://bff.example'; delete process.env.COOKIE_DOMAIN; });
afterEach(() => {
  global.fetch = originalFetch;
  if (originalBffUrl === undefined) delete process.env.BFF_USER_API_URL; else process.env.BFF_USER_API_URL = originalBffUrl;
  if (originalCookieDomain === undefined) delete process.env.COOKIE_DOMAIN; else process.env.COOKIE_DOMAIN = originalCookieDomain;
});

const sameOrigin = { 'Sec-Fetch-Site': 'same-origin' };
const optionsRequest = (headers = sameOrigin) => new NextRequest('http://localhost/api/auth/passkey/options', { method: 'POST', headers });
const answerRequest = (body, headers = { ...sameOrigin, 'Content-Type': 'application/json', 'User-Agent': 'Firefox/130' }) =>
  new NextRequest('http://localhost/api/auth/passkey', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
const CREDENTIAL = { id: 'k3m9x7p2', rawId: 'k3m9x7p2', type: 'public-key', response: { signature: 'MEUCIQ' } };
const bffError = (status, extra = {}) => Response.json({ error: { code: 'X', message: 'technical english', details: [] } }, { status, ...extra });
const sessionHeaders = [['set-cookie', 'accessToken=access-fixture; Path=/; HttpOnly'], ['set-cookie', 'refreshToken=refresh-fixture; Path=/api; HttpOnly']];

test('MAIR-811 options: the challenge of BFF User comes back as { id, options }, never cached', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url: String(url), method: init.method }; return Response.json({ id: 'ceremony-1', options: { publicKey: { challenge: 'q1w2' } }, extra: 'dropped' }); };
  const result = await passkeyOptions(optionsRequest());
  assert.deepEqual(sent, { url: 'http://bff.example/auth/passkey/options', method: 'POST' });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { id: 'ceremony-1', options: { publicKey: { challenge: 'q1w2' } } });
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('MAIR-811 options: a request that does not come from the sign-in page is refused without calling the BFF', async () => {
  global.fetch = async () => { throw new Error('the BFF must not be called'); };
  assert.equal((await passkeyOptions(optionsRequest({ 'Sec-Fetch-Site': 'cross-site' }))).status, 403);
});

test('MAIR-811 options: 403 (passkeys not accepted) and 503 (no relying party) have their own reason', async () => {
  global.fetch = async () => bffError(403);
  const refused = await passkeyOptions(optionsRequest());
  assert.equal(refused.status, 403);
  assert.deepEqual(await refused.json(), { message: 'Les passkeys ne sont pas acceptées.', reason: 'not-accepted' });

  global.fetch = async () => bffError(503);
  const unavailable = await passkeyOptions(optionsRequest());
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { message: 'Connexion par passkey indisponible pour le moment. Utilisez votre mot de passe.', reason: 'unavailable' });
});

test('MAIR-811 options: an unconfigured BFF is « unavailable » without a request', async () => {
  delete process.env.BFF_USER_API_URL; delete process.env.USER_BFF_URL;
  global.fetch = async () => { throw new Error('no BFF configured'); };
  const result = await passkeyOptions(optionsRequest());
  assert.equal(result.status, 503);
  assert.equal((await result.json()).reason, 'unavailable');
});

test('MAIR-811 options: 429 keeps the Retry-After delay, other failures are French and never the technical English', async () => {
  global.fetch = async () => bffError(429, { headers: { 'Retry-After': '30' } });
  const limited = await passkeyOptions(optionsRequest());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '30');
  assert.deepEqual(await limited.json(), { message: 'Trop de tentatives.', retryAfter: 30 });

  global.fetch = async () => bffError(502);
  const down = await passkeyOptions(optionsRequest());
  assert.equal(down.status, 502);
  assert.equal((await down.json()).message, 'Le service de connexion est indisponible. Veuillez réessayer.');
});

test('MAIR-811 options: an answer without id or options is a 502, and an unreachable BFF is told apart from a timeout', async () => {
  global.fetch = async () => Response.json({ id: '', options: {} });
  assert.equal((await passkeyOptions(optionsRequest())).status, 502);
  global.fetch = async () => new Response('not json', { status: 200 });
  assert.equal((await passkeyOptions(optionsRequest())).status, 502);
  global.fetch = async () => { throw new TypeError('connect ECONNREFUSED'); };
  assert.equal((await passkeyOptions(optionsRequest())).status, 502);
  global.fetch = async () => { const error = new Error('timeout'); error.name = 'TimeoutError'; throw error; };
  assert.equal((await passkeyOptions(optionsRequest())).status, 504);
});

test('MAIR-811 passkey: the signed answer goes to the BFF with the user agent, and the session cookies come back', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url: String(url), body: JSON.parse(init.body) }; return Response.json({ message: 'Logged in successfully' }, { headers: sessionHeaders }); };
  const result = await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }));
  assert.equal(sent.url, 'http://bff.example/auth/passkey');
  assert.deepEqual(sent.body, { id: 'ceremony-1', credential: CREDENTIAL, device_info: 'Firefox/130' });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { success: true });
  assert.equal(result.cookies.get('accessToken').value, 'access-fixture');
  assert.equal(result.cookies.get('refreshToken').value, 'refresh-fixture');
  assert.equal(result.cookies.get('twoFactorToken'), undefined, 'a passkey asks no second factor');
  assert.equal(result.cookies.get('twoFactorSetupToken'), undefined);
});

test('MAIR-811 passkey: without a user agent the device is « Navigateur inconnu » (the contract requires a value)', async () => {
  let sent;
  global.fetch = async (_url, init) => { sent = JSON.parse(init.body); return Response.json({}, { headers: sessionHeaders }); };
  await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }, { ...sameOrigin, 'Content-Type': 'application/json' }));
  assert.equal(sent.device_info.length > 0, true);
});

test('MAIR-811 passkey: a malformed request never reaches the BFF', async () => {
  global.fetch = async () => { throw new Error('the BFF must not be called'); };
  for (const body of ['not json', { credential: CREDENTIAL }, { id: 'x'.repeat(513), credential: CREDENTIAL }, { id: 'ceremony-1' }, { id: 'ceremony-1', credential: 'text' }, { id: 'ceremony-1', credential: null }, { id: 'ceremony-1', credential: [] }, { id: 7, credential: CREDENTIAL }]) {
    const result = await passkey(answerRequest(body));
    assert.equal(result.status, 400, JSON.stringify(body).slice(0, 60));
    assert.deepEqual(await result.json(), { message: 'La requête est invalide.' });
  }
  assert.equal((await passkey(answerRequest({ id: 'a', credential: CREDENTIAL }, { ...sameOrigin, 'Content-Type': 'text/plain' }))).status, 415);
  assert.equal((await passkey(answerRequest({ id: 'a', credential: CREDENTIAL }, { 'Sec-Fetch-Site': 'cross-site', 'Content-Type': 'application/json' }))).status, 403);
});

test('MAIR-811 passkey: 401 is « Cette passkey n’est pas reconnue. » and opens no session', async () => {
  global.fetch = async () => bffError(401);
  const result = await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }));
  assert.equal(result.status, 401);
  assert.deepEqual(await result.json(), { message: 'Cette passkey n’est pas reconnue.', reason: 'unknown-passkey' });
  assert.equal(result.cookies.get('accessToken'), undefined);
});

test('MAIR-811 passkey: 403 is « Ce compte est désactivé. », 429 keeps Retry-After, 503 falls back to the password', async () => {
  global.fetch = async () => bffError(403);
  const disabled = await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }));
  assert.equal(disabled.status, 403);
  assert.deepEqual(await disabled.json(), { message: 'Ce compte est désactivé.', reason: 'disabled' });

  global.fetch = async () => bffError(429, { headers: { 'Retry-After': '12' } });
  const limited = await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '12');

  global.fetch = async () => bffError(503);
  const unavailable = await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }));
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).reason, 'unavailable');
});

test('MAIR-811 passkey: other BFF failures are French messages, an unreachable BFF or a missing session is told apart', async () => {
  global.fetch = async () => bffError(400);
  const invalid = await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }));
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).message, 'La connexion par passkey a échoué. Veuillez réessayer.');

  global.fetch = async () => Response.json({ message: 'ok' });
  assert.equal((await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }))).status, 502, 'no session cookies in the answer');

  global.fetch = async () => { throw new TypeError('connect ECONNREFUSED'); };
  assert.equal((await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }))).status, 502);
});

test('MAIR-811 passkey: no BFF configured, or no shared cookie domain in production, is a 503 without a request', async () => {
  global.fetch = async () => { throw new Error('the BFF must not be called'); };
  const production = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const noDomain = await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }));
    assert.equal(noDomain.status, 503);
    assert.equal((await noDomain.json()).message, 'La session partagée n’est pas configurée.');
  } finally {
    if (production === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = production;
  }
  delete process.env.BFF_USER_API_URL; delete process.env.USER_BFF_URL;
  const unconfigured = await passkey(answerRequest({ id: 'ceremony-1', credential: CREDENTIAL }));
  assert.equal(unconfigured.status, 503);
  assert.equal((await unconfigured.json()).message, 'Le service de connexion n’est pas configuré.');
});
