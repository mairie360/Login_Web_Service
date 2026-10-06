const assert = require('node:assert/strict');
const path = require('node:path');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { installReactRuntime, mount } = require('./support/server-view.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');

installReactRuntime();
const React = require('react');
const Logout = requireTs('src/components/Logout.tsx').default;
const proxy = requireTs('src/app/[...path]/route.ts');
const cookieExpiry = requireTs('src/app/api/auth/logout/route.ts');
const contract = OpenApiContract.load(path.join(__dirname, '..', 'contracts/openapi.json'));
const bff = new ContractMockServer('DISPOSABLE_LOGOUT_SESSION', contract);
const realFetch = global.fetch;
const origin = 'http://localhost:5000';
const saved = Object.fromEntries(['BFF_USER_API_URL', 'USER_BFF_URL', 'COOKIE_DOMAIN', 'NODE_ENV'].map(key => [key, process.env[key]]));
let view, calls, navigations, cookies, expiryStatus, upstreamGate, expiryGate;
const savedWindow = global.window;

const fault = status => {
  const body = { code: 'UPSTREAM_ERROR', message: 'Disposable logout refusal' };
  assert.deepEqual(contract.validate(contract.document.components.schemas.ApiErrorResponse, body), []);
  // Published orval types only 2XX for logout; error status is an explicit QA exception.
  return { status, body, outOfContract: true };
};
const success = () => ({ body: contract.sample(contract.document.components.schemas.LogoutResponse) });

before(async () => { await bff.start(); });
after(async () => {
  global.fetch = realFetch;
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  await bff.stop();
  if (savedWindow === undefined) delete global.window; else global.window = savedWindow;
});
beforeEach(() => {
  bff.reset();
  process.env.BFF_USER_API_URL = bff.url;
  delete process.env.USER_BFF_URL;
  process.env.COOKIE_DOMAIN = 'localhost';
  process.env.NODE_ENV = 'production';
  calls = []; navigations = []; expiryStatus = undefined; upstreamGate = undefined; expiryGate = undefined;
  global.window = { location: { replace: href => navigations.push(href) } };
  cookies = new Map([['accessToken', 'disposable-session'], ['refreshToken', 'disposable-refresh']]);
  global.fetch = async (input, init = {}) => {
    const url = new URL(String(input), origin);
    if (url.origin === bff.url) return realFetch(input, init);
    assert.equal(url.origin, origin, 'No request can reach a real identity service');
    calls.push({ path: url.pathname, method: init.method, credentials: init.credentials, cache: init.cache });
    const headers = new Headers(init.headers);
    headers.set('origin', origin);
    headers.set('sec-fetch-site', 'same-origin');
    headers.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
    const request = new NextRequest(url, { ...init, headers });
    if (url.pathname === '/auth/logout') {
      const response = await proxy.POST(request, { params: Promise.resolve({ path: ['auth', 'logout'] }) });
      if (upstreamGate) await upstreamGate.promise;
      return response;
    }
    assert.equal(url.pathname, '/api/auth/logout');
    const response = expiryStatus ? new Response(null, { status: expiryStatus }) : cookieExpiry.POST(request);
    if (expiryGate) await expiryGate.promise;
    for (const header of response.headers.getSetCookie()) {
      const name = header.split('=', 1)[0];
      if (/max-age=0/i.test(header)) cookies.delete(name);
    }
    return response;
  };
});
afterEach(() => {
  if (view) assert.doesNotMatch(view.html, /<(header|aside|nav|footer)\b/);
  view?.unmount(); view = undefined;
  assert.deepEqual(bff.violations, []);
  global.fetch = realFetch;
});
const render = () => { view = mount(React.createElement(Logout, { navigate: href => navigations.push(href) })); };
const startLogout = () => view.fire((_props, text, tag) => tag === 'button' && text === 'Se déconnecter', 'onClick');
const settled = () => view.waitFor(html => html.includes('role="alert"') || navigations.length > 0);
const assertCookieExpiry = () => {
  assert.deepEqual(calls.map(call => call.path), ['/auth/logout', '/api/auth/logout']);
  for (const call of calls) assert.deepEqual({ method: call.method, credentials: call.credentials, cache: call.cache }, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
  });
  assert.equal(bff.requests.length, 1, 'No logout replay');
  assert.equal(bff.requests[0].headers.authorization, 'Bearer disposable-session');
  assert.equal(bff.requests[0].headers.cookie, undefined);
  assert.equal(cookies.size, 0, 'Both local session cookies must expire');
  assert.deepEqual(navigations, ['/']);
  assert.doesNotMatch(view.html, /role="alert"/);
};

test('opening logout waits for an explicit action without requests, cookie expiry or navigation', async () => {
  bff.on('POST', '/auth/logout', success());
  render();
  await view.act(() => undefined);
  // Drain an unexpected automatic request before failing, so it cannot leak into the next case.
  if (calls.length) await settled();
  assert.equal(calls.length, 0);
  assert.equal(bff.requests.length, 0);
  assert.equal(cookies.size, 2);
  assert.deepEqual(navigations, []);
  assert.equal(view.hostElements((props, text, tag) => tag === 'button' && text === 'Se déconnecter').length, 1);
  assert.doesNotMatch(view.html, /Déconnexion en cours|role="alert"/);
});

test('logout retry is synchronous-single-flight while its real proxy request is pending', async () => {
  bff.on('POST', '/auth/logout', fault(503));
  render();
  const initial = view.hostElements((props, text, tag) => tag === 'button' && text === 'Se déconnecter')[0];
  if (initial) await view.act(() => initial.props.onClick());
  await settled();
  let release;
  upstreamGate = { promise: new Promise(resolve => { release = resolve; }) };
  bff.on('POST', '/auth/logout', success());
  const retry = view.hostElements((props, text, tag) => tag === 'button' && text === 'Réessayer')[0].props.onClick;
  try {
    await view.act(() => { retry(); retry(); });
    assert.equal(calls.filter(call => call.path === '/auth/logout').length, 2);
    assert.equal(cookies.size, 2);
    assert.deepEqual(navigations, []);
    assert.match(view.html, /Déconnexion en cours/);
  } finally {
    release();
    await settled();
  }
  assert.equal(bff.requests.length, 2);
  assert.equal(cookies.size, 0);
  assert.deepEqual(navigations, ['/']);
});

test('an already rejected session expires both local cookies and returns to Login after real proxy401', async () => {
  bff.on('POST', '/auth/logout', fault(401));
  render(); await startLogout(); await settled();
  assertCookieExpiry();
});

test('successful upstream logout still expires both local cookies before returning to Login', async () => {
  bff.on('POST', '/auth/logout', success());
  render(); await startLogout(); await settled();
  assertCookieExpiry();
});

test('the default browser navigation replaces the expired logout document with standalone Login', async () => {
  bff.on('POST', '/auth/logout', fault(401));
  view = mount(React.createElement(Logout));
  await startLogout();
  await settled();
  assertCookieExpiry();
});

for (const status of [403, 503]) test(`logout${status} remains a refusal, preserving cookies and offering explicit retry`, async () => {
  bff.on('POST', '/auth/logout', fault(status));
  render(); await startLogout(); await settled();
  assert.match(view.html, /La déconnexion n’a pas abouti/);
  assert.match(view.html, /Réessayer/);
  assert.equal(calls.length, 1);
  assert.equal(cookies.size, 2);
  assert.deepEqual(navigations, []);
});

test('an upstream network failure does not become an unauthorized-session success', async () => {
  bff.on('POST', '/auth/logout', { dropConnection: true });
  render(); await startLogout(); await settled();
  assert.match(view.html, /La déconnexion n’a pas abouti/);
  assert.equal(calls.length, 1);
  assert.equal(cookies.size, 2);
  assert.deepEqual(navigations, []);
});

test('local expiry failure after upstream401 never navigates or claims the cookies cleared', async () => {
  bff.on('POST', '/auth/logout', fault(401));
  expiryStatus = 503; // Explicit disposable adapter fault, not a BFF response.
  render(); await startLogout(); await settled();
  assert.deepEqual(calls.map(call => call.path), ['/auth/logout', '/api/auth/logout']);
  assert.equal(bff.requests.length, 1);
  assert.equal(cookies.size, 2);
  assert.deepEqual(navigations, []);
  assert.match(view.html, /La déconnexion n’a pas abouti/);
});

test('an explicit retry after503 can recover a subsequently rejected401 session without a third upstream call', async () => {
  bff.on('POST', '/auth/logout', fault(503));
  render(); await startLogout(); await settled();
  bff.on('POST', '/auth/logout', fault(401));
  await view.fire((_props, text, tag) => tag === 'button' && text === 'Réessayer', 'onClick');
  await settled();
  assert.deepEqual(calls.map(call => call.path), ['/auth/logout', '/auth/logout', '/api/auth/logout']);
  assert.equal(bff.requests.length, 2);
  assert.equal(cookies.size, 0);
  assert.deepEqual(navigations, ['/']);
  assert.doesNotMatch(view.html, /role="alert"/);
});

test('the initial explicit command remains single-flight through local cookie expiry and navigation', async () => {
  bff.on('POST', '/auth/logout', success());
  let release;
  expiryGate = { promise: new Promise(resolve => { release = resolve; }) };
  render();
  const command = view.hostElements((props, text, tag) => tag === 'button' && text === 'Se déconnecter')[0].props.onClick;
  try {
    await view.act(() => { command(); command(); });
    await view.waitFor(() => calls.some(call => call.path === '/api/auth/logout'));
    await view.act(() => command());
    assert.equal(calls.length, 2);
    assert.equal(cookies.size, 2);
    assert.deepEqual(navigations, []);
    assert.match(view.html, /Déconnexion en cours/);
    assert.equal(view.hostElements((_props, text, tag) => tag === 'button' && text === 'Se déconnecter').length, 0);
  } finally {
    release();
    await settled();
  }
  assertCookieExpiry();
  await view.act(() => command());
  assert.equal(calls.length, 2, 'A completed handoff cannot be replayed through a cached command');
  assert.deepEqual(navigations, ['/']);
});

test('a refused local expiry releases the command guard for explicit recovery only', async () => {
  bff.on('POST', '/auth/logout', success());
  expiryStatus = 503;
  render(); await startLogout(); await settled();
  assert.equal(cookies.size, 2);
  assert.deepEqual(navigations, []);
  expiryStatus = undefined;
  bff.on('POST', '/auth/logout', fault(401));
  await view.fire((_props, text, tag) => tag === 'button' && text === 'Réessayer', 'onClick');
  await settled();
  assert.equal(calls.length, 4);
  assert.equal(bff.requests.length, 2);
  assert.equal(cookies.size, 0);
  assert.deepEqual(navigations, ['/']);
});
