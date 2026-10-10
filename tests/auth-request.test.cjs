const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const login = requireTs('src/app/api/auth/login/route.ts');
const change = requireTs('src/app/api/auth/force-change-password/route.ts');
const changeAlias = requireTs('src/app/api/auth/force_change_password/route.ts');
const logout = requireTs('src/app/api/auth/logout/route.ts');
const { proxyBffRequest } = requireTs('src/lib/bff-proxy.ts');
const realFetch = global.fetch;
const previous = Object.fromEntries(['BFF_USER_API_URL', 'LOGIN_FRONT_URL', 'NODE_ENV', 'COOKIE_DOMAIN'].map(key => [key, process.env[key]]));
afterEach(() => {
  global.fetch = realFetch;
  for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value;
});
const request = (headers, path = '/api/auth/login') => new NextRequest('https://login.example.test' + path, {
  method: 'POST', headers,
  body: JSON.stringify({ email: 'agent@example.test', password: 'fixture-password', newPassword: 'fixture-new-password' }),
});
const routes = [
  ['login', req => login.POST(req), true],
  ['password change', req => change.POST(req), true],
  ['password change alias', req => changeAlias.POST(req), true],
  ['session logout', req => logout.POST(req), true],
  ...['login', 'force_change_password', 'logout'].map(path => ['contract proxy ' + path, req => proxyBffRequest(req, { params: Promise.resolve({ path: ['auth', path] }) }), path !== 'logout']),
];

for (const [name, handle, json] of routes) {
  test(name + ' refuses missing, foreign and same-site browser metadata before any BFF call or cookie change', async () => {
    process.env.BFF_USER_API_URL = 'https://bff.example.test';
    delete process.env.LOGIN_FRONT_URL;
    let calls = 0;
    global.fetch = async () => { calls++; throw new Error('unexpected call'); };
    for (const headers of [
      {}, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' }, { 'sec-fetch-site': 'none' },
      { origin: 'https://login.example.test' },
      { 'sec-fetch-site': 'same-origin', origin: 'https://foreign.example.test' },
      { 'sec-fetch-site': 'same-origin', origin: 'null' },
    ]) {
      const response = await handle(request({ 'content-type': 'application/json', cookie: 'accessToken=fixture-access; passwordChangeToken=fixture-one-time', ...headers }));
      assert.equal(response.status, 403);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('set-cookie'), null);
      assert.doesNotMatch(JSON.stringify(await response.json()), /fixture-access|fixture-one-time/);
    }
    assert.equal(calls, 0);
  });
  if (json) test(name + ' refuses simple form media types before any BFF call', async () => {
    process.env.BFF_USER_API_URL = 'https://bff.example.test';
    delete process.env.LOGIN_FRONT_URL;
    global.fetch = async () => { throw new Error('unexpected call'); };
    process.env.LOGIN_FRONT_URL = 'https://login.example.test';
    for (const mediaType of ['', 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=fixture', 'application/jsonp']) {
      const response = await handle(request({ 'sec-fetch-site': 'same-origin', origin: 'https://login.example.test', 'content-type': mediaType }));
      assert.equal(response.status, 415);
      assert.equal(response.headers.get('set-cookie'), null);
    }
  });
}

test('same-origin JSON login still creates the existing shared session and accepts a JSON charset', async () => {
  delete process.env.LOGIN_FRONT_URL;
  process.env.BFF_USER_API_URL = 'https://bff.example.test';
  process.env.NODE_ENV = 'test';
  let received;
  global.fetch = async (url, init) => { received = { url, init }; return Response.json({ refresh_token: 'fixture-refresh' }, { headers: { authorization: 'Bearer fixture-access' } }); };
  const response = await login.POST(request({ 'sec-fetch-site': 'same-origin', origin: 'https://login.example.test', 'content-type': 'Application/JSON; charset=utf-8' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(response.cookies.get('accessToken').value, 'fixture-access');
  assert.equal(response.cookies.get('refreshToken').value, 'fixture-refresh');
  assert.equal(received.url, 'https://bff.example.test/auth/login');
  assert.equal(received.init.headers['sec-fetch-site'], undefined);
});

test('the configured public Login origin is authoritative when the ingress URL differs', async () => {
  process.env.LOGIN_FRONT_URL = 'https://login.public.example/';
  process.env.BFF_USER_API_URL = 'https://bff.example.test';
  process.env.NODE_ENV = 'test';
  let calls = 0;
  global.fetch = async () => { calls++; return Response.json({ token: 'fixture-first-connection' }, { status: 412 }); };
  const headers = { 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', origin: 'https://login.public.example' };
  const response = await login.POST(request(headers));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).requiresPasswordChange, true);
  assert.equal(response.cookies.get('passwordChangeToken').value, 'fixture-first-connection');
  const rejected = await login.POST(request({ ...headers, origin: 'https://login.example.test' }));
  assert.equal(rejected.status, 403);
  assert.equal(calls, 1);
  assert.equal(rejected.headers.get('set-cookie'), null);
});
