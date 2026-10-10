const assert = require('node:assert/strict');
const path = require('node:path');
const { before, beforeEach, after, afterEach, test } = require('node:test');
const { installReactRuntime, mount, stubModule } = require('./support/server-view.cjs');
installReactRuntime();
const React = require('react');
stubModule('next/image', { __esModule: true, default: ({ src, alt }) => React.createElement('img', { src, alt }) });
const { requireTs } = require('./support/load-ts.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const { BrowserFront, ORIGIN } = require('./support/browser-front.cjs');
const { forgetUserSession } = require('@mairie360/lib-components/next');
const contract = OpenApiContract.load(path.join(__dirname, 'fixtures/user-session-openapi.json'));
const user = new ContractMockServer('PUBLISHED_USER_SESSION', contract);
const front = new BrowserFront(user);
const Home = requireTs('src/app/page.tsx').default;
const Login = requireTs('src/components/Login.tsx').default;
const savedEnv = Object.fromEntries(['LOGIN_FRONT_URL', 'PROJECT_FRONT_URL', 'DASHBOARD_FRONT_URL', 'COOKIE_DOMAIN', 'NODE_ENV', 'BFF_USER_API_URL'].map(k => [k, process.env[k]]));
const target = 'https://projects.mairie.test/?project=retained&task=42';
let serial = 0;
let view;
let destinations;
before(async () => { await user.start(); front.install(); });
after(async () => { front.uninstall(); await user.stop(); });
beforeEach(() => {
  front.reset(); user.reset(); serial++;
  process.env.LOGIN_FRONT_URL = ORIGIN;
  process.env.PROJECT_FRONT_URL = 'https://projects.mairie.test/';
  process.env.DASHBOARD_FRONT_URL = 'https://dashboard.mairie.test/';
  process.env.BFF_USER_API_URL = user.url;
  process.env.NODE_ENV = 'test'; delete process.env.COOKIE_DOMAIN;
  front.cookies.set('refreshToken', 'disposable-old-' + serial);
  destinations = [];
  global.window = { location: { assign: url => destinations.push(url) } };
  user.on('POST', '/auth/refresh', { body: { message: 'JWT refreshed successfully' }, headers: {
    'Set-Cookie': [`accessToken=disposable-access-${serial}; HttpOnly; Path=/auth; Max-Age=300`, `refreshToken=disposable-new-${serial}; HttpOnly; Path=/auth`],
  } });
});
afterEach(() => {
  view?.unmount(); view = undefined;
  forgetUserSession(user.url, front.cookies.get('refreshToken'));
  delete global.window;
  for (const [key, value] of Object.entries(savedEnv)) value === undefined ? delete process.env[key] : process.env[key] = value;
  assert.deepEqual([...front.violations, ...user.violations], []);
});
const render = async params => { view = mount(await Home({ searchParams: Promise.resolve(params) })); };

test('actual Home restores a scoped-cookie session through the published owner and preserves the requested page', async () => {
  await render({ redirect: target, resumeSession: '1' });
  await view.waitFor(() => destinations.length === 1);
  assert.deepEqual(destinations, [target]);
  assert.deepEqual(front.browserCalls, [{ method: 'POST', path: '/api/auth/refresh' }]);
  assert.equal(user.requests.length, 1);
  assert.deepEqual(user.requests[0].body, { refresh_token: 'disposable-old-' + serial });
  assert.equal(front.cookies.get('accessToken'), 'disposable-access-' + serial);
  assert.equal(front.cookies.get('refreshToken'), 'disposable-new-' + serial);
  assert.doesNotMatch(view.html, /<aside|<nav|<footer|disposable-old|disposable-access|disposable-new/);
});

for (const [label, params] of [
  ['ordinary Login', {}],
  ['unflagged return', { redirect: target }],
  ['foreign return', { redirect: 'https://foreign.test/', resumeSession: '1' }],
  ['credential-bearing return', { redirect: 'https://user:password@projects.mairie.test/', resumeSession: '1' }],
  ['repeated flag', { redirect: target, resumeSession: ['1', '1'] }],
  ['repeated return', { redirect: [target, target], resumeSession: '1' }],
  ['return to Login', { redirect: ORIGIN + '/?resumeSession=1', resumeSession: '1' }],
]) test(`${label} does not start an automatic renewal`, async () => {
  await render(params);
  assert.match(view.html, /Se connecter/);
  assert.doesNotMatch(view.html, /Reprise de votre session/);
  assert.deepEqual(front.browserCalls, []);
  assert.deepEqual(user.requests, []);
});

test('missing Login configuration does not start automatic renewal', async () => {
  delete process.env.LOGIN_FRONT_URL;
  await render({ redirect: target, resumeSession: '1' });
  assert.deepEqual(front.browserCalls, []);
  assert.match(view.html, /Se connecter/);
});

for (const status of [401, 429, 503]) test(`owner${status} keeps sign-in available without logout`, async () => {
  user.on('POST', '/auth/refresh', { status, body: { message: 'Disposable refusal' }, outOfContract: true });
  await render({ redirect: target, resumeSession: '1' });
  await view.waitFor(html => html.includes('role="alert"'));
  assert.match(view.html, status === 401 ? /Votre session a expiré/ : /temporairement indisponible/);
  assert.match(view.html, /Se connecter/);
  assert.doesNotMatch(view.html, /Internal|Erreur BFF|aria-busy="true"/);
  assert.deepEqual(destinations, []);
  assert.deepEqual(front.browserCalls, [{ method: 'POST', path: '/api/auth/refresh' }]);
  assert.equal(user.requests.length, 1);
  assert.equal(front.cookies.get('refreshToken'), 'disposable-old-' + serial);
});

test('an invalid successful owner reply cannot resume the page', async () => {
  user.on('POST', '/auth/refresh', { body: { message: 42 }, outOfContract: true });
  await render({ redirect: target, resumeSession: '1' });
  await view.waitFor(html => html.includes('role="alert"'));
  assert.deepEqual(destinations, []);
  assert.equal(user.requests.length, 1);
  assert.equal(front.cookies.get('refreshToken'), 'disposable-old-' + serial);
});

test('a browser navigation failure leaves the normal form usable after a validated receipt', async () => {
  view = mount(React.createElement(Login, { redirectUrl: target, resumeSession: true, navigate() { throw new Error('disposable navigation refusal'); } }));
  await view.waitFor(html => html.includes('role="alert"'));
  assert.match(view.html, /Se connecter/);
  assert.doesNotMatch(view.html, /aria-busy="true"/);
  assert.equal(user.requests.length, 1);
});
