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
let view, calls, navigations, cookies, expiryStatus;
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
  calls = []; navigations = []; expiryStatus = undefined;
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
      return proxy.POST(request, { params: Promise.resolve({ path: ['auth', 'logout'] }) });
    }
    assert.equal(url.pathname, '/api/auth/logout');
    const response = expiryStatus ? new Response(null, { status: expiryStatus }) : cookieExpiry.POST(request);
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

test('an already rejected session expires both local cookies and returns to Login after real proxy401', async () => {
  bff.on('POST', '/auth/logout', fault(401));
  render(); await settled();
  assertCookieExpiry();
});

test('successful upstream logout still expires both local cookies before returning to Login', async () => {
  bff.on('POST', '/auth/logout', success());
  render(); await settled();
  assertCookieExpiry();
});

test('the default browser navigation replaces the expired logout document with standalone Login', async () => {
  bff.on('POST', '/auth/logout', fault(401));
  view = mount(React.createElement(Logout));
  await settled();
  assertCookieExpiry();
});

for (const status of [403, 503]) test(`logout${status} remains a refusal, preserving cookies and offering explicit retry`, async () => {
  bff.on('POST', '/auth/logout', fault(status));
  render(); await settled();
  assert.match(view.html, /La déconnexion n’a pas abouti/);
  assert.match(view.html, /Réessayer/);
  assert.equal(calls.length, 1);
  assert.equal(cookies.size, 2);
  assert.deepEqual(navigations, []);
});

test('an upstream network failure does not become an unauthorized-session success', async () => {
  bff.on('POST', '/auth/logout', { dropConnection: true });
  render(); await settled();
  assert.match(view.html, /La déconnexion n’a pas abouti/);
  assert.equal(calls.length, 1);
  assert.equal(cookies.size, 2);
  assert.deepEqual(navigations, []);
});

test('local expiry failure after upstream401 never navigates or claims the cookies cleared', async () => {
  bff.on('POST', '/auth/logout', fault(401));
  expiryStatus = 503; // Explicit disposable adapter fault, not a BFF response.
  render(); await settled();
  assert.deepEqual(calls.map(call => call.path), ['/auth/logout', '/api/auth/logout']);
  assert.equal(bff.requests.length, 1);
  assert.equal(cookies.size, 2);
  assert.deepEqual(navigations, []);
  assert.match(view.html, /La déconnexion n’a pas abouti/);
});

test('an explicit retry after503 can recover a subsequently rejected401 session without a third upstream call', async () => {
  bff.on('POST', '/auth/logout', fault(503));
  render(); await settled();
  bff.on('POST', '/auth/logout', fault(401));
  await view.fire((_props, text, tag) => tag === 'button' && text === 'Réessayer', 'onClick');
  await settled();
  assert.deepEqual(calls.map(call => call.path), ['/auth/logout', '/auth/logout', '/api/auth/logout']);
  assert.equal(bff.requests.length, 2);
  assert.equal(cookies.size, 0);
  assert.deepEqual(navigations, ['/']);
  assert.doesNotMatch(view.html, /role="alert"/);
});
