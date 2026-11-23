// MAIR-811 F8: the passkey creation of the agent who just signed in with a password, and the name kept afterwards.
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { POST: options } = requireTs('src/app/api/passkeys/options/route.ts');
const { POST: register } = requireTs('src/app/api/passkeys/route.ts');
const { POST: rename } = requireTs('src/app/api/passkeys/name/route.ts');
const { readPasskeyOffer } = requireTs('src/lib/passkey-offer.ts');
const originalFetch = global.fetch;
const originalBffUrl = process.env.BFF_USER_API_URL;
beforeEach(() => { process.env.BFF_USER_API_URL = 'http://bff.example'; });
afterEach(() => {
  global.fetch = originalFetch;
  if (originalBffUrl === undefined) delete process.env.BFF_USER_API_URL; else process.env.BFF_USER_API_URL = originalBffUrl;
});

const SESSION = 'accessToken=access-fixture';
const post = (url, body, cookie = SESSION, site = 'same-origin') => new NextRequest(`http://localhost${url}`, {
  method: 'POST',
  headers: { 'Sec-Fetch-Site': site, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { cookie } : {}) },
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
});
const CREDENTIAL = { id: 'cred', rawId: 'AQ', type: 'public-key', response: { attestationObject: 'Ag', clientDataJSON: 'Aw' } };
const bffError = (status, extra = {}) => Response.json({ error: { code: 'X', message: 'Upstream service error', details: [] } }, { status, ...extra });

test('MAIR-811 the password sign-ins pass the passkey offer only when it is two booleans', () => {
  assert.deepEqual(readPasskeyOffer({ message: 'ok', passkey_offer: { allowed: true, registered: false } }), { allowed: true, registered: false });
  for (const body of [null, 'x', {}, { passkey_offer: null }, { passkey_offer: { allowed: 'yes', registered: false } }, { passkey_offer: { allowed: true } }]) {
    assert.equal(readPasskeyOffer(body), undefined);
  }
});

test('MAIR-811 options: the session of the cookie goes as a Bearer to the BFF, only the options come back', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url: String(url), method: init.method, auth: init.headers.Authorization }; return Response.json({ options: { publicKey: { challenge: 'AQID' } }, extra: 'dropped' }); };
  const result = await options(post('/api/passkeys/options'));
  assert.deepEqual(sent, { url: 'http://bff.example/user/me/passkeys/options', method: 'POST', auth: 'Bearer access-fixture' });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { options: { publicKey: { challenge: 'AQID' } } });
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('MAIR-811 options: no session, no BFF or a cross-site request never reaches the BFF', async () => {
  let called = false;
  global.fetch = async () => { called = true; return Response.json({}); };
  const none = await options(post('/api/passkeys/options', undefined, ''));
  assert.deepEqual([none.status, (await none.json()).reason], [401, 'session']);
  assert.ok((await options(post('/api/passkeys/options', undefined, SESSION, 'cross-site'))).status >= 400);
  delete process.env.BFF_USER_API_URL;
  assert.equal((await options(post('/api/passkeys/options'))).status, 503);
  assert.equal(called, false);
});

test('MAIR-811 options and creation: the refusals of the BFF keep their status with a French message', async () => {
  const reasons = { 401: 'session', 403: 'not-accepted', 409: 'already-registered', 503: 'unavailable' };
  for (const status of [401, 403, 409, 429, 500, 503]) {
    global.fetch = async () => bffError(status, status === 429 ? { headers: { 'Retry-After': '9' } } : {});
    for (const result of [await options(post('/api/passkeys/options')), await register(post('/api/passkeys', { label: 'x', credential: CREDENTIAL }))]) {
      const body = await result.json();
      assert.equal(result.status, status);
      assert.doesNotMatch(body.message, /Upstream|error/i);
      if (reasons[status]) assert.equal(body.reason, reasons[status]);
      if (status === 429) assert.equal(body.retryAfter, 9);
    }
  }
  global.fetch = async () => Response.json({});
  assert.equal((await options(post('/api/passkeys/options'))).status, 502, 'an answer without options');
});

test('MAIR-811 creation: the provisional name and the browser answer go to the BFF, the id and the manager come back', async () => {
  let sent;
  global.fetch = async (url, init) => {
    sent = { url: String(url), auth: init.headers.Authorization, body: JSON.parse(init.body) };
    return Response.json({ id: 7, label: 'Passkey Mairie 360', provider: 'Gestionnaire de mots de passe Google', created_at: 'x', last_used_at: null }, { status: 201 });
  };
  const result = await register(post('/api/passkeys', { label: '  Passkey Mairie 360 ', credential: CREDENTIAL }));
  assert.deepEqual(sent, { url: 'http://bff.example/user/me/passkeys', auth: 'Bearer access-fixture', body: { label: 'Passkey Mairie 360', credential: CREDENTIAL } });
  assert.equal(result.status, 201);
  assert.deepEqual(await result.json(), { id: 7, label: 'Passkey Mairie 360', provider: 'Gestionnaire de mots de passe Google' });

  global.fetch = async () => Response.json({ id: 8, label: 'x', provider: null }, { status: 201 });
  assert.equal((await (await register(post('/api/passkeys', { label: 'x', credential: CREDENTIAL }))).json()).provider, null);
  global.fetch = async () => bffError(400);
  const refused = await register(post('/api/passkeys', { label: 'x', credential: CREDENTIAL }));
  assert.deepEqual([refused.status, (await refused.json()).reason], [400, 'refused']);
  global.fetch = async () => Response.json({ label: 'x' }, { status: 201 });
  assert.equal((await register(post('/api/passkeys', { label: 'x', credential: CREDENTIAL }))).status, 502, 'an answer without id');
});

test('MAIR-811 creation: an invalid body is refused before the BFF', async () => {
  let called = false;
  global.fetch = async () => { called = true; return Response.json({}); };
  for (const body of ['{', [], { credential: CREDENTIAL }, { label: '  ', credential: CREDENTIAL }, { label: 'x'.repeat(101), credential: CREDENTIAL }, { label: 'x' }, { label: 'x', credential: [] }]) {
    assert.equal((await register(post('/api/passkeys', body))).status, 400, JSON.stringify(body));
  }
  assert.equal((await register(post('/api/passkeys', { label: 'x', credential: CREDENTIAL }, ''))).status, 401);
  assert.equal(called, false);
});

test('MAIR-811 name: the name the agent keeps goes to the BFF as a PATCH of the passkey', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url: String(url), method: init.method, auth: init.headers.Authorization, body: JSON.parse(init.body) }; return Response.json({ id: 7, label: 'Ordinateur de la mairie', provider: null, created_at: 'x', last_used_at: null }); };
  const result = await rename(post('/api/passkeys/name', { id: 7, label: ' Ordinateur de la mairie ' }));
  assert.deepEqual(sent, { url: 'http://bff.example/user/me/passkeys/7', method: 'PATCH', auth: 'Bearer access-fixture', body: { label: 'Ordinateur de la mairie' } });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { label: 'Ordinateur de la mairie' });
});

test('MAIR-811 name: invalid id or name, no session and the refusals of the BFF', async () => {
  let called = false;
  global.fetch = async () => { called = true; return Response.json({}); };
  for (const body of ['{', { label: 'x' }, { id: '7', label: 'x' }, { id: 0, label: 'x' }, { id: 1.5, label: 'x' }, { id: 2147483648, label: 'x' }]) {
    assert.equal((await rename(post('/api/passkeys/name', body))).status, 400, JSON.stringify(body));
  }
  const blank = await rename(post('/api/passkeys/name', { id: 7, label: ' ' }));
  assert.deepEqual([blank.status, (await blank.json()).reason], [400, 'label']);
  assert.equal((await rename(post('/api/passkeys/name', { id: 7, label: 'x' }, ''))).status, 401);
  assert.equal(called, false);

  global.fetch = async () => bffError(404);
  const gone = await rename(post('/api/passkeys/name', { id: 7, label: 'x' }));
  assert.deepEqual([gone.status, (await gone.json()).reason], [404, 'not-found']);
  global.fetch = async () => bffError(502);
  assert.match((await (await rename(post('/api/passkeys/name', { id: 7, label: 'x' }))).json()).message, /indisponible/);
  global.fetch = async () => { throw new TypeError('fetch failed'); };
  assert.equal((await rename(post('/api/passkeys/name', { id: 7, label: 'x' }))).status, 502);
});
