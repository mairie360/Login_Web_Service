const assert = require('node:assert/strict');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { describe, test, before, after, afterEach, beforeEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');

// MAIR-153: Keycloak sign-in. `/api/auth/keycloak` sends the browser to the realm with state, nonce and
// PKCE; `/api/auth/keycloak/callback` checks them, redeems the code through BFF User `POST /auth/keycloak`
// (the contract-driven mock below) and opens the requested module with the shared session cookies.

const contract = OpenApiContract.load(path.join(__dirname, '..', 'contracts', 'openapi.json'));
const bff = new ContractMockServer('BFF_USER', contract);
const REALM = 'https://auth.mairie.test/realms/mairie360';
const LOGIN = 'https://login.mairie.test';
const DASHBOARD = 'https://dashboard.mairie.test/';
const PROJECTS = 'https://projects.mairie.test/projects?view=grid';
const CALLBACK = `${LOGIN}/api/auth/keycloak/callback`;
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0';
const ENV = {
  KEYCLOAK_REALM_URL: `${REALM}/`, KEYCLOAK_CLIENT_ID: 'core-api', LOGIN_FRONT_URL: `${LOGIN}/`,
  DASHBOARD_FRONT_URL: DASHBOARD, PROJECT_FRONT_URL: 'https://projects.mairie.test/', COOKIE_DOMAIN: '.mairie.test',
};
const saved = Object.fromEntries([...Object.keys(ENV), 'BFF_USER_API_URL'].map(key => [key, process.env[key]]));
let start;
let callback;

before(async () => {
  await bff.start();
  start = requireTs('src/app/api/auth/keycloak/route.ts');
  callback = requireTs('src/app/api/auth/keycloak/callback/route.ts');
});
after(async () => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await bff.stop();
});
beforeEach(() => {
  Object.assign(process.env, ENV, { BFF_USER_API_URL: bff.url });
});
afterEach(() => {
  const violations = [...bff.violations];
  bff.reset();
  assert.deepEqual(violations, [], 'exchange outside the BFF User contract');
});

const apiError = (status, code) => ({ status, body: { error: { code, message: 'Upstream refusal', details: [] } }, outOfContract: true });
const sessionReply = () => ({
  body: { message: 'Logged in successfully' },
  headers: { 'Set-Cookie': ['accessToken=keycloak-access; Path=/; HttpOnly; SameSite=Strict', 'refreshToken=keycloak-refresh; Path=/auth; HttpOnly; SameSite=Strict'] },
});

const startLogin = (redirect = PROJECTS) => start.GET(new NextRequest(`${LOGIN}/api/auth/keycloak?redirect=${encodeURIComponent(redirect)}`));

/** Starts a sign-in and returns the realm parameters plus the cookie the browser sends back. */
async function begin(redirect) {
  const response = await startLogin(redirect);
  const authorization = new URL(response.headers.get('location'));
  const cookie = response.cookies.get('keycloakLogin');
  return { response, authorization, params: authorization.searchParams, cookie };
}

function returnFromRealm(query, cookie) {
  return callback.GET(new NextRequest(`${CALLBACK}?${new URLSearchParams(query)}`, {
    headers: { 'User-Agent': USER_AGENT, ...(cookie ? { cookie: `keycloakLogin=${cookie}` } : {}) },
  }));
}

const loginPage = (response) => {
  assert.equal(response.status, 303);
  const location = new URL(response.headers.get('location'), LOGIN);
  assert.equal(location.origin + location.pathname, `${LOGIN}/`);
  return Object.fromEntries(location.searchParams);
};

describe('MAIR-153 start of the Keycloak sign-in', () => {
  test('sends the browser to the realm with Core client, callback, state, nonce and S256 PKCE', async () => {
    const { response, authorization, params, cookie } = await begin();

    assert.equal(response.status, 303);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(authorization.origin + authorization.pathname, `${REALM}/protocol/openid-connect/auth`);
    assert.equal(params.get('client_id'), 'core-api');
    assert.equal(params.get('response_type'), 'code');
    assert.equal(params.get('scope'), 'openid email');
    assert.equal(params.get('redirect_uri'), CALLBACK);
    assert.equal(params.get('code_challenge_method'), 'S256');
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, 'lax');
    assert.equal(cookie.path, '/api/auth/keycloak');
    assert.equal(cookie.maxAge, 600);
    const login = JSON.parse(Buffer.from(cookie.value, 'base64url').toString('utf8'));
    assert.equal(login.state, params.get('state'));
    assert.equal(login.nonce, params.get('nonce'));
    assert.equal(params.get('code_challenge'), createHash('sha256').update(login.verifier).digest('base64url'));
    assert.equal(login.redirect, PROJECTS);
    assert.equal(bff.requests.length, 0);
  });

  test('every sign-in gets fresh single-use values', async () => {
    const first = (await begin()).params;
    const second = (await begin()).params;
    for (const name of ['state', 'nonce', 'code_challenge']) assert.notEqual(first.get(name), second.get(name), name);
  });

  test('an unknown return origin falls back to Dashboard instead of an open redirect', async () => {
    const { cookie } = await begin('https://evil.example/');
    assert.equal(JSON.parse(Buffer.from(cookie.value, 'base64url').toString('utf8')).redirect, DASHBOARD);
  });

  test('an instance without Keycloak keeps the password sign-in and says so', async () => {
    delete process.env.KEYCLOAK_REALM_URL;
    const response = await startLogin();
    assert.deepEqual(loginPage(response), { keycloakError: 'unconfigured', redirect: PROJECTS });
    assert.equal(response.cookies.get('keycloakLogin'), undefined);
  });

  test('an invalid realm URL or client id disables the Keycloak sign-in', async () => {
    for (const [key, value] of [['KEYCLOAK_REALM_URL', 'ftp://auth.mairie.test'], ['KEYCLOAK_REALM_URL', `${REALM}?x=1`], ['KEYCLOAK_CLIENT_ID', 'core api'], ['LOGIN_FRONT_URL', '']]) {
      Object.assign(process.env, ENV, { [key]: value });
      assert.equal(loginPage(await startLogin()).keycloakError, 'unconfigured', `${key}=${value}`);
    }
  });
});

describe('MAIR-153 return from Keycloak', () => {
  test('a valid code opens the requested module with the shared session cookies', async () => {
    bff.on('POST', '/auth/keycloak', sessionReply());
    const { params, cookie } = await begin();
    const login = JSON.parse(Buffer.from(cookie.value, 'base64url').toString('utf8'));

    const response = await returnFromRealm({ code: 'authorization-code', state: params.get('state'), session_state: 'kc' }, cookie.value);

    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), PROJECTS);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const [call] = bff.calls('/auth/keycloak', 'POST');
    assert.deepEqual(call.body, {
      code: 'authorization-code', redirect_uri: CALLBACK, code_verifier: login.verifier, nonce: login.nonce, device_info: USER_AGENT,
    });
    const access = response.cookies.get('accessToken');
    assert.equal(access.value, 'keycloak-access');
    assert.equal(access.domain, '.mairie.test');
    assert.equal(access.httpOnly, true);
    assert.equal(access.sameSite, 'strict');
    assert.equal(response.cookies.get('refreshToken').value, 'keycloak-refresh');
    assert.equal(response.cookies.get('keycloakLogin').value, '');
    assert.equal(response.cookies.get('keycloakLogin').maxAge, 0);
  });

  test('a cancelled sign-in returns to the page with the cancellation message and no BFF call', async () => {
    const { params, cookie } = await begin();
    const response = await returnFromRealm({ error: 'access_denied', state: params.get('state') }, cookie.value);
    assert.deepEqual(loginPage(response), { keycloakError: 'cancelled', redirect: PROJECTS });
    assert.equal(response.cookies.get('keycloakLogin').maxAge, 0);
    assert.equal(bff.requests.length, 0);
  });

  test('a forged or replayed return is refused before any BFF call', async () => {
    const { params, cookie } = await begin();
    const cases = [
      [{ code: 'c', state: 'forged-state' }, cookie.value],
      [{ code: 'c', state: params.get('state') }, undefined],
      [{ state: params.get('state') }, cookie.value],
      [{ code: 'c', state: params.get('state') }, Buffer.from('{"state":"short"}').toString('base64url')],
      [{ code: 'c', state: params.get('state') }, 'not base64 json'],
    ];
    for (const [query, sent] of cases) {
      assert.equal(loginPage(await returnFromRealm(query, sent)).keycloakError, 'expired', JSON.stringify(query));
    }
    assert.equal(bff.requests.length, 0);
  });

  test('Keycloak and BFF User refusals map to the page messages', async () => {
    const { params, cookie } = await begin();
    const cases = [
      [apiError(401, 'UNAUTHORIZED'), 'expired'],
      [apiError(403, 'FORBIDDEN'), 'account'],
      [apiError(429, 'TOO_MANY_REQUESTS'), 'busy'],
      [apiError(503, 'SERVICE_UNAVAILABLE'), 'unconfigured'],
      [apiError(502, 'BAD_GATEWAY'), 'unavailable'],
      [{ body: { message: 'Logged in successfully' } }, 'unavailable'],
      [{ dropConnection: true }, 'unavailable'],
    ];
    for (const [reply, expected] of cases) {
      bff.on('POST', '/auth/keycloak', reply);
      const response = await returnFromRealm({ code: 'authorization-code', state: params.get('state') }, cookie.value);
      assert.deepEqual(loginPage(response), { keycloakError: expected, redirect: PROJECTS }, JSON.stringify(reply));
      assert.equal(response.cookies.get('accessToken'), undefined);
    }
    assert.equal(bff.calls('/auth/keycloak', 'POST').length, cases.length);
  });

  test('a Keycloak error other than a cancellation asks to retry', async () => {
    const { cookie } = await begin();
    assert.equal(loginPage(await returnFromRealm({ error: 'temporarily_unavailable' }, cookie.value)).keycloakError, 'unavailable');
    assert.equal(loginPage(await returnFromRealm({ error: 'invalid_request' }, cookie.value)).keycloakError, 'expired');
  });

  test('without BFF User, or in production without the shared cookie domain, no code is sent anywhere', async () => {
    const { params, cookie } = await begin();
    const query = { code: 'authorization-code', state: params.get('state') };
    process.env.BFF_USER_API_URL = '';
    assert.equal(loginPage(await returnFromRealm(query, cookie.value)).keycloakError, 'unavailable');
    process.env.BFF_USER_API_URL = bff.url;
    delete process.env.COOKIE_DOMAIN;
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      assert.equal(loginPage(await returnFromRealm(query, cookie.value)).keycloakError, 'unavailable');
    } finally {
      process.env.NODE_ENV = env;
    }
    delete process.env.KEYCLOAK_CLIENT_ID;
    assert.equal(loginPage(await returnFromRealm(query, cookie.value)).keycloakError, 'unconfigured');
    assert.equal(bff.requests.length, 0);
  });
});
