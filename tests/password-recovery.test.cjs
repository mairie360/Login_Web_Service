const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { proxyBffRequest } = requireTs('src/lib/bff-proxy.ts');
const { POST: resetPassword } = requireTs('src/app/api/auth/reset-password/route.ts');
const saved = Object.fromEntries(['BFF_USER_API_URL', 'LOGIN_FRONT_URL', 'NODE_ENV', 'COOKIE_DOMAIN', 'TRUST_INGRESS_IP_HEADERS'].map(key => [key, process.env[key]]));
const realFetch = global.fetch;
const token = '94a0c99b-e39c-4a8e-96e8-1c8caad20cab';
const valid = { token, newPassword: 'updated-password' };
let calls;
beforeEach(() => {
  process.env.BFF_USER_API_URL = 'https://bff.example.test';
  process.env.LOGIN_FRONT_URL = 'https://login.example.test';
  process.env.NODE_ENV = 'test';
  delete process.env.COOKIE_DOMAIN;
  calls = [];
  global.fetch = async (url, init) => { calls.push({ url, init }); return new Response(null); };
});
afterEach(() => {
  global.fetch = realFetch;
  for (const [key, value] of Object.entries(saved)) value === undefined ? delete process.env[key] : process.env[key] = value;
});
const request = (action, body, headers = {}) => new NextRequest(`https://login.example.test${action.startsWith('/') ? action : `/auth/${action}`}`, { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin', origin: 'https://login.example.test', ...headers }, body: JSON.stringify(body) });
const handle = (action, body, headers) => proxyBffRequest(request(action, body, headers), { params: Promise.resolve({ path: ['auth', action] }) });
const session = (cookies = ['accessToken=fixture-access; Path=/; HttpOnly; Max-Age=90', 'refreshToken=fixture-refresh; Path=/auth; HttpOnly'], body = { message: 'Signed in' }) => {
  const headers = new Headers(); for (const cookie of cookies) headers.append('set-cookie', cookie);
  return Response.json(body, { headers });
};

test('forgot password forwards only the email and returns a neutral message for the published empty response', async () => {
  const result = await handle('forgot_password', { email: ' agent@example.test ', token: 'must-not-forward' });
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { success: true, message: 'Si un compte existe, un e-mail a été envoyé.' });
  assert.equal(calls[0].url, 'https://bff.example.test/auth/forgot_password');
  assert.deepEqual(JSON.parse(calls[0].init.body), { email: 'agent@example.test' });
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('set-cookie'), null);
});
test('reset consumes the real cookie-only session without exposing credentials and preserves frontend scopes', async () => {
  process.env.NODE_ENV = 'production'; process.env.COOKIE_DOMAIN = '.mairie.example';
  global.fetch = async (url, init) => { calls.push({ url, init }); return session(); };
  const result = await handle('reset_password', valid, { 'user-agent': 'Fixture browser' });
  assert.equal(result.status, 200); assert.deepEqual(await result.json(), { success: true });
  assert.equal(calls[0].url, 'https://bff.example.test/auth/reset_password');
  assert.deepEqual(JSON.parse(calls[0].init.body), { token, new_password: 'updated-password', device_info: 'Fixture browser' });
  assert.equal(result.cookies.get('accessToken').value, 'fixture-access');
  assert.equal(result.cookies.get('refreshToken').value, 'fixture-refresh');
  for (const name of ['accessToken', 'refreshToken']) {
    const cookie = result.cookies.get(name);
    assert.equal(cookie.domain, '.mairie.example'); assert.equal(cookie.secure, true); assert.equal(cookie.httpOnly, true); assert.equal(cookie.sameSite, 'strict');
  }
  assert.equal(result.cookies.get('accessToken').path, '/'); assert.ok(result.cookies.get('accessToken').maxAge <= 90);
  assert.equal(result.cookies.get('refreshToken').path, '/api'); assert.equal(result.headers.get('cache-control'), 'no-store');
});
for (const action of ['forgot_password', 'reset_password']) {
  test(action + ' requires same-origin JSON before parsing or forwarding credentials', async () => {
    for (const headers of [{ 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }, { origin: 'https://evil.test' }, { 'sec-fetch-site': '' }]) {
      const result = await handle(action, valid, headers); assert.equal(result.status, 403); assert.equal(result.headers.get('set-cookie'), null);
    }
    const result = await handle(action, valid, { 'content-type': 'text/plain' }); assert.equal(result.status, 415);
    assert.equal(calls.length, 0);
  });
  test(action + ' handles malformed and non-object JSON before the BFF', async () => {
    for (const body of [null, [], {}, 'text', 42]) {
      const result = await handle(action, body); assert.equal(result.status, 400); assert.equal(result.headers.get('cache-control'), 'no-store');
    }
    const req = request(action, {}); req.json = async () => { throw new SyntaxError('invalid'); };
    assert.equal((await proxyBffRequest(req, { params: Promise.resolve({ path: ['auth', action] }) })).status, 400);
    assert.equal(calls.length, 0);
  });
  test(action + ' fails closed on absent configuration and transport failures', async () => {
    const body = action === 'forgot_password' ? { email: 'agent@example.test' } : valid;
    delete process.env.BFF_USER_API_URL;
    assert.equal((await handle(action, body)).status, 503); assert.equal(calls.length, 0);
    process.env.BFF_USER_API_URL = 'https://bff.example.test';
    for (const [name, status] of [['TimeoutError', 504], ['TypeError', 502]]) {
      global.fetch = async () => { throw Object.assign(new Error('secret-sensitive-detail'), { name }); };
      const result = await handle(action, body); assert.equal(result.status, status); assert.equal(result.headers.get('set-cookie'), null); assert.doesNotMatch(JSON.stringify(await result.json()), /secret-sensitive-detail/);
    }
  });
}
test('invalid reset tokens and password boundaries never reach the BFF', async () => {
  for (const body of [{ ...valid, token: '' }, { ...valid, token: 'not-a-uuid' }, { ...valid, newPassword: 'short' }, { ...valid, newPassword: 'a'.repeat(256) }]) assert.equal((await handle('reset_password', body)).status, 400);
  assert.equal(calls.length, 0);
});
test('expired or reused reset tokens produce a safe retry message without setting any cookie', async () => {
  global.fetch = async () => Response.json({ error: { message: token } }, { status: 401, headers: { 'set-cookie': 'accessToken=untrusted; Path=/' } });
  const result = await handle('reset_password', valid);
  assert.equal(result.status, 401); assert.match((await result.json()).message, /expiré ou déjà utilisé/); assert.equal(result.headers.get('set-cookie'), null);
});
for (const [name, cookies, body] of [
  ['missing session', [], { message: 'Signed in' }], ['partial session', ['accessToken=partial; Path=/'], { message: 'Signed in' }],
  ['invalid response', undefined, {}], ['expired session', ['accessToken=fixture; Path=/; Max-Age=0', 'refreshToken=fixture; Path=/auth'], { message: 'Signed in' }],
]) test(name + ' cannot report reset success', async () => {
  global.fetch = async () => session(cookies, body);
  const result = await handle('reset_password', valid); assert.equal(result.status, 502); assert.equal(result.headers.get('set-cookie'), null);
});
test('production reset requires shared cookie configuration before sending a one-time token', async () => {
  process.env.NODE_ENV = 'production';
  const result = await handle('reset_password', valid); assert.equal(result.status, 503); assert.equal(calls.length, 0);
});
test('BFF rejection never reveals registration or sensitive upstream details', async () => {
  for (const status of [400, 404, 429, 500]) {
    global.fetch = async () => Response.json({ error: 'registered-agent@example.test ' + token }, { status });
    const result = await handle('forgot_password', { email: 'agent@example.test' });
    assert.equal(result.status, status); assert.doesNotMatch(JSON.stringify(await result.json()), /registered-agent|94a0c99b/); assert.equal(result.headers.get('set-cookie'), null);
  }
});

test('the public reset endpoint rejects a cookie session whose success body is not JSON', async () => {
  global.fetch = async () => new Response('sensitive malformed response', { headers: session().headers });
  const result = await resetPassword(request('/api/auth/reset-password', valid));
  assert.equal(result.status, 502);
  assert.match((await result.json()).message, /réponse invalide/);
  assert.equal(result.headers.get('set-cookie'), null);
});

test('the public reset endpoint translates refusal and throttling without accepting upstream cookies', async () => {
  for (const [status, message] of [[401, /expiré ou déjà utilisé/], [403, /expiré ou déjà utilisé/], [429, /Trop de demandes/], [503, /n’a pas pu être modifié/]]) {
    global.fetch = async () => Response.json({ message: 'sensitive upstream detail' }, { status, headers: session().headers });
    const result = await resetPassword(request('/api/auth/reset-password', valid));
    assert.equal(result.status, status);
    assert.match((await result.json()).message, message);
    assert.equal(result.headers.get('set-cookie'), null);
  }
});

test('the public reset endpoint supplies a bounded device description with its published payload', async () => {
  for (const userAgent of [undefined, 'x'.repeat(600)]) {
    global.fetch = async (url, init) => { calls.push({ url, init }); return session(); };
    const result = await resetPassword(request('/api/auth/reset-password', valid, userAgent === undefined ? {} : { 'user-agent': userAgent }));
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { success: true });
    assert.deepEqual(JSON.parse(calls.at(-1).init.body), {
      token, new_password: valid.newPassword,
      device_info: userAgent === undefined ? 'Navigateur inconnu' : userAgent.slice(0, 512),
    });
  }
});
