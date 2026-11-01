const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const { POST } = requireTs('src/app/api/auth/logout/route.ts');
const contract = OpenApiContract.load(require('node:path').join(__dirname, 'fixtures/user-session-openapi.json'));
const keys = ['COOKIE_DOMAIN', 'NODE_ENV', 'LOGIN_FRONT_URL', 'BFF_USER_API_URL'];
const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
const realFetch = global.fetch;
let calls;
beforeEach(() => {
  process.env.COOKIE_DOMAIN = '.dev.mairie360-eip.fr';
  process.env.NODE_ENV = 'production';
  process.env.LOGIN_FRONT_URL = 'https://login.dev.mairie360-eip.fr/';
  process.env.BFF_USER_API_URL = 'https://bff.example.test';
  calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    assert.deepEqual(contract.validate(contract.schema('LogoutView'), JSON.parse(init.body)), []);
    const body = { message: 'Disposable session closed', session_revoked: true };
    assert.deepEqual(contract.validate(contract.schema('LogoutResponse'), body), []);
    return Response.json(body);
  };
});
afterEach(() => { global.fetch = realFetch; for (const [k,v] of Object.entries(saved)) v === undefined ? delete process.env[k] : process.env[k] = v; });
const request = (headers = {}) => new NextRequest('https://login.dev.mairie360-eip.fr/api/auth/logout', {
  method: 'POST', headers: { origin: 'https://login.dev.mairie360-eip.fr', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', cookie: 'accessToken=disposable-access; refreshToken=disposable-refresh', ...headers }, body: '{}',
});

test('confirmed User revocation expires both shared cookies with their exact domain and paths', async () => {
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).session_revoked, true);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  for (const [name,path] of [['accessToken','/'],['refreshToken','/api']]) {
    const cookie = response.cookies.get(name);
    assert.deepEqual({ value: cookie.value, domain: cookie.domain, path: cookie.path, maxAge: cookie.maxAge, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, secure: cookie.secure }, {
      value: '', domain: '.dev.mairie360-eip.fr', path, maxAge: 0, httpOnly: true, sameSite: 'strict', secure: true,
    });
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://bff.example.test/auth/logout');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer disposable-access');
  assert.equal(calls[0].init.headers.Cookie, undefined);
  assert.deepEqual(JSON.parse(calls[0].init.body), { refresh_token: 'disposable-refresh' });
});

test('cross-site, foreign and missing origin metadata cannot revoke or clear cookies', async () => {
  for (const headers of [{ 'sec-fetch-site': 'cross-site' }, { origin: 'https://untrusted.example' }, { origin: '' }]) {
    const response = await POST(request(headers)); assert.equal(response.status, 403); assert.equal(response.headers.get('set-cookie'), null);
  }
  assert.equal(calls.length, 0);
});

test('production fails closed if the shared cookie domain is unavailable', async () => {
  delete process.env.COOKIE_DOMAIN;
  const response = await POST(request());assert.equal(response.status, 503);assert.equal(response.headers.get('set-cookie'), null);assert.equal(calls.length, 0);
});

for (const status of [401, 403, 503]) test(`User logout${status} preserves cookies and the refusal for explicit recovery`, async () => {
  global.fetch = async () => Response.json({ message: 'Disposable refusal' }, { status });
  const response = await POST(request());assert.equal(response.status,status);assert.equal(response.headers.get('set-cookie'),null);
});

test('the earlier published message-only response closes local cookies without claiming Core revocation', async () => {
  global.fetch = async () => Response.json({ message: 'Logged out successfully' });
  const response = await POST(request());assert.equal(response.status,200);assert.equal((await response.json()).session_revoked,false);assert.equal(response.cookies.get('refreshToken').maxAge,0);
});

test('the published package keeps the rotated pair after failed logout and supports one explicit retry', async () => {
  const token = 'disposable-logout-renewal';
  const rotated = 'disposable-logout-rotated';
  const jwt = seconds => 'h.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString('base64url') + '.s';
  const access = jwt(300);
  let rotations = 0, revocations = 0;
  global.fetch = async (url, init) => {
    if (String(url).endsWith('/auth/refresh')) {
      rotations++;
      assert.deepEqual(JSON.parse(init.body), { refresh_token: token });
      const response = Response.json({ message: 'JWT refreshed successfully' });
      response.headers.append('Set-Cookie', `accessToken=${access}; Max-Age=300; Path=/auth; HttpOnly`);
      response.headers.append('Set-Cookie', `refreshToken=${rotated}; Path=/auth; HttpOnly`);
      return response;
    }
    revocations++;
    assert.deepEqual(JSON.parse(init.body), { refresh_token: rotated });
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${access}`);
    return revocations === 1
      ? Response.json({ message: 'Unavailable' }, { status: 503 })
      : Response.json({ message: 'Closed', session_revoked: true });
  };
  const failed = await POST(request({ cookie: `accessToken=${jwt(-10)}; refreshToken=${token}` }));
  assert.equal(failed.status, 503);
  assert.equal(failed.cookies.get('refreshToken').value, rotated);
  assert.equal(failed.cookies.get('accessToken').value, access);
  assert.doesNotMatch(JSON.stringify(await failed.json()), /disposable-logout-rotated/);
  const retried = await POST(request({ cookie: `accessToken=${access}; refreshToken=${rotated}` }));
  assert.equal(retried.status, 200);
  assert.equal((await retried.json()).session_revoked, true);
  assert.equal(retried.cookies.get('refreshToken').maxAge, 0);
  assert.equal(rotations, 1);
  assert.equal(revocations, 2);
});
