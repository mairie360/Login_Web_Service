const assert = require('node:assert/strict');
const path = require('node:path');
const { describe, test, before, after, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const { ContractMockServer, unreachableUrl } = require('./support/contract-mock-server.cjs');

// Les route handlers et le proxy sont exécutés tels quels, avec le vrai `fetch`, contre un faux
// BFF User servi en HTTP et piloté par contracts/openapi.json : toute requête hors contrat (chemin,
// méthode, paramètre, corps) ou toute réponse mockée non conforme devient une violation, et un test
// échoue dès qu'un appel réseau sort vers une autre origine que ce faux BFF.

const contract = OpenApiContract.load(path.join(__dirname, '..', 'contracts', 'openapi.json'));
const bff = new ContractMockServer('BFF_USER', contract)
  .allowUndeclared('GET', '/openapi.json', 'Le BFF sert son propre contrat, que le proxy relaie toujours', { body: { openapi: '3.1.0' } })
  .allowUndeclared('HEAD', '/openapi.json', 'Le BFF sert son propre contrat, que le proxy relaie toujours', { body: { openapi: '3.1.0' } });

const COOKIE_DOMAIN = '.mairie360.test';
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0';
const realFetch = global.fetch;
const outgoing = [];
let allowedOrigins = [];
let login;
let forceChangePassword;
let forceChangePasswordAlias;
let catchAll;
let proxy;

before(async () => {
  await bff.start();
  // Les route handlers lisent l'URL du BFF et COOKIE_DOMAIN au chargement : ils sont importés après.
  process.env.BFF_USER_API_URL = `${bff.url}/`;
  process.env.COOKIE_DOMAIN = COOKIE_DOMAIN;
  global.fetch = (input, init) => {
    outgoing.push(new URL(input instanceof Request ? input.url : String(input)));
    return realFetch(input, init);
  };
  login = requireTs('src/app/api/auth/login/route.ts');
  forceChangePassword = requireTs('src/app/api/auth/force-change-password/route.ts');
  forceChangePasswordAlias = requireTs('src/app/api/auth/force_change_password/route.ts');
  catchAll = requireTs('src/app/[...path]/route.ts');
  proxy = requireTs('src/lib/bff-proxy.ts');
});

after(async () => {
  global.fetch = realFetch;
  await bff.stop();
});

afterEach(() => {
  const escaped = outgoing.filter((url) => ![bff.url, ...allowedOrigins].includes(url.origin));
  const violations = [...bff.violations];
  outgoing.length = 0;
  allowedOrigins = [];
  bff.reset();
  process.env.BFF_USER_API_URL = `${bff.url}/`;
  assert.deepEqual(escaped.map(String), [], 'appel réseau hors du BFF');
  assert.deepEqual(violations, [], 'échange hors contrat avec le BFF');
});

const loginRequest = (body, headers = {}) => new NextRequest('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: Object.fromEntries(Object.entries({ 'Content-Type': 'application/json', 'User-Agent': USER_AGENT, ...headers }).filter(([, value]) => value !== null)),
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

const changeRequest = (body, token = 'first-connection-token', url = 'http://localhost:5000/api/auth/force-change-password') => new NextRequest(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(token ? { cookie: `passwordChangeToken=${token}` } : {}) },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

const apiError = (status, message) => ({ status, body: { message } });

/** Réduit les délais d'expiration des route handlers pour simuler un BFF trop lent sans attendre 10 s. */
async function withShortTimeouts(run) {
  const original = AbortSignal.timeout;
  AbortSignal.timeout = () => original.call(AbortSignal, 50);
  try {
    return await run();
  } finally {
    AbortSignal.timeout = original;
  }
}

describe('POST /api/auth/login → BFF POST /auth/login', () => {
  test('stores the Authorization access token in the shared cookie and sends a contract-valid LoginView', async () => {
    bff.on('POST', '/auth/login', { body: { refresh_token: 'refresh-token' }, headers: { Authorization: 'Bearer access-token' } });

    const response = await login.POST(loginRequest({ email: '  alice.dupont@mairie360.fr ', password: 'MotDePasse123', device_info: 'ignored' }, { cookie: 'accessToken=stale' }));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    const cookie = response.cookies.get('accessToken');
    assert.equal(cookie.value, 'access-token');
    assert.deepEqual({ httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, path: cookie.path, maxAge: cookie.maxAge, domain: cookie.domain }, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 86400, domain: COOKIE_DOMAIN });
    const [call] = bff.calls('/auth/login', 'POST');
    assert.equal(bff.requests.length, 1);
    assert.deepEqual(call.body, { email: 'alice.dupont@mairie360.fr', password: 'MotDePasse123', device_info: USER_AGENT });
    assert.equal(call.headers['content-type'], 'application/json');
    assert.equal(call.headers.cookie, undefined);
    assert.equal(call.headers.authorization, undefined);
  });

  test('falls back to a default device_info when the browser sends no user-agent', async () => {
    bff.on('POST', '/auth/login', { body: { refresh_token: 'refresh-token' }, headers: { Authorization: 'bearer access-token' } });

    const response = await login.POST(loginRequest({ email: 'alice.dupont@mairie360.fr', password: 'MotDePasse123' }, { 'User-Agent': null }));

    assert.equal(response.status, 200);
    assert.equal(bff.calls('/auth/login')[0].body.device_info, 'Navigateur inconnu');
  });

  test('first connection (412) keeps the one-time token in a short-lived HttpOnly cookie', async () => {
    bff.on('POST', '/auth/login', { status: 412, body: { token: 'first-connection-token' } });

    const response = await login.POST(loginRequest({ email: 'alice.dupont@mairie360.fr', password: 'MotDePasse123' }));

    assert.equal(response.status, 200);
    assert.equal((await response.json()).requiresPasswordChange, true);
    const cookie = response.cookies.get('passwordChangeToken');
    assert.deepEqual({ value: cookie.value, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, path: cookie.path, maxAge: cookie.maxAge }, { value: 'first-connection-token', httpOnly: true, sameSite: 'strict', path: '/api/auth', maxAge: 600 });
    assert.equal(response.cookies.get('accessToken'), undefined);
  });

  for (const [status, message] of [[400, 'Les informations saisies sont invalides.'], [401, 'Email ou mot de passe incorrect.'], [500, 'Le service de connexion est indisponible. Veuillez réessayer.'], [502, 'Le service de connexion est indisponible. Veuillez réessayer.']]) {
    test(`documented ${status} errors keep their status, show a French message instead of the BFF one, and open no session`, async () => {
      bff.on('POST', '/auth/login', apiError(status, 'Upstream service error'));

      const response = await login.POST(loginRequest({ email: 'alice.dupont@mairie360.fr', password: 'mauvais' }));

      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { message });
      assert.equal(response.cookies.get('accessToken'), undefined);
    });
  }

  for (const [status, message] of [[412, 'Votre mot de passe doit être modifié lors de cette première connexion.'], [403, 'La connexion a échoué. Veuillez réessayer.'], [503, 'Le service de connexion est indisponible. Veuillez réessayer.']]) {
    test(`an out-of-contract ${status} still gets a French message`, async () => {
      bff.on('POST', '/auth/login', { status, raw: 'upstream failure', contentType: 'text/plain', outOfContract: true });

      const response = await login.POST(loginRequest({ email: 'alice.dupont@mairie360.fr', password: 'MotDePasse123' }));

      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { message });
    });
  }

  test('a 200 without Authorization header never becomes a session, even with a refresh token', async () => {
    // Le contrat déclare l'en-tête Authorization sur 200 : sa disparition est une réponse hors contrat.
    bff.on('POST', '/auth/login', { body: { refresh_token: 'refresh-token' }, outOfContract: true });

    const response = await login.POST(loginRequest({ email: 'alice.dupont@mairie360.fr', password: 'MotDePasse123' }));

    assert.equal(response.status, 502);
    assert.equal(response.cookies.get('accessToken'), undefined);
  });

  for (const [name, body] of [['invalid JSON', '{'], ['missing password', { email: 'alice.dupont@mairie360.fr' }], ['blank email', { email: '   ', password: 'x' }], ['non-string credentials', { email: 42, password: true }], ['an email the BFF LoginView rejects', { email: 'alice@mairie360', password: 'x' }], ['an email with a space', { email: 'alice dupont@mairie360.fr', password: 'x' }]]) {
    test(`${name} is rejected before any BFF call`, async () => {
      const response = await login.POST(loginRequest(body));

      assert.equal(response.status, 400);
      assert.equal(typeof (await response.json()).message, 'string');
      assert.equal(bff.requests.length, 0);
    });
  }

  test('an unreachable BFF yields 502 and a slow one 504', async () => {
    bff.on('POST', '/auth/login', { dropConnection: true });
    const dropped = await login.POST(loginRequest({ email: 'alice.dupont@mairie360.fr', password: 'MotDePasse123' }));
    assert.equal(dropped.status, 502);
    assert.deepEqual(await dropped.json(), { message: 'Le service de connexion est indisponible.' });

    bff.on('POST', '/auth/login', { body: { refresh_token: 'refresh-token' }, headers: { Authorization: 'Bearer late' }, delayMs: 500 });
    const slow = await withShortTimeouts(() => login.POST(loginRequest({ email: 'alice.dupont@mairie360.fr', password: 'MotDePasse123' })));
    assert.equal(slow.status, 504);
    assert.equal(slow.cookies.get('accessToken'), undefined);
  });
});

describe('POST /api/auth/force-change-password → BFF POST /auth/force_change_password', () => {
  test('the underscore URL called by Login.tsx is the same handler', () => {
    assert.equal(forceChangePasswordAlias.POST, forceChangePassword.POST);
  });

  test('maps newPassword to a contract-valid ForceChangePasswordView and clears the one-time cookie', async () => {
    bff.on('POST', '/auth/force_change_password', { status: 204 });

    const response = await forceChangePasswordAlias.POST(changeRequest({ newPassword: 'NouveauMotDePasse123' }, 'first-connection-token', 'http://localhost:5000/api/auth/force_change_password'));

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { success: true });
    assert.deepEqual(bff.calls('/auth/force_change_password', 'POST').map((call) => call.body), [{ new_password: 'NouveauMotDePasse123', token: 'first-connection-token' }]);
    const cookie = response.cookies.get('passwordChangeToken');
    assert.deepEqual({ value: cookie.value, path: cookie.path, maxAge: cookie.maxAge }, { value: '', path: '/api/auth', maxAge: 0 });
  });

  for (const [name, body, token] of [['missing token cookie', { newPassword: 'NouveauMotDePasse123' }, null], ['missing new password', {}, 'first-connection-token']]) {
    test(`${name} asks to restart the login without calling the BFF`, async () => {
      const response = await forceChangePassword.POST(changeRequest(body, token));

      assert.equal(response.status, 400);
      assert.equal((await response.json()).restartLogin, true);
      assert.equal(bff.requests.length, 0);
    });
  }

  test('invalid JSON is rejected before any BFF call', async () => {
    const response = await forceChangePassword.POST(changeRequest('{'));

    assert.equal(response.status, 400);
    assert.equal(bff.requests.length, 0);
  });

  for (const [status, bffMessage] of [[401, 'Invalid token'], [403, 'Unknown or expired user token']]) {
    test(`a refused token (${status}) restarts the login, clears the cookie and shows a French message`, async () => {
      bff.on('POST', '/auth/force_change_password', apiError(status, bffMessage));

      const response = await forceChangePassword.POST(changeRequest({ newPassword: 'NouveauMotDePasse123' }));

      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { message: 'Le lien de changement de mot de passe est invalide ou expiré. Reconnectez-vous.', restartLogin: true });
      assert.equal(response.cookies.get('passwordChangeToken').maxAge, 0);
    });
  }

  for (const [status, message] of [[400, 'Le nouveau mot de passe est invalide.'], [500, 'Le service de changement de mot de passe est indisponible. Veuillez réessayer.'], [502, 'Le service de changement de mot de passe est indisponible. Veuillez réessayer.']]) {
    test(`documented ${status} errors keep their status, show a French message and keep the cookie for a retry`, async () => {
      bff.on('POST', '/auth/force_change_password', apiError(status, 'Invalid password-change payload'));

      const response = await forceChangePassword.POST(changeRequest({ newPassword: 'NouveauMotDePasse123' }));

      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { message });
      assert.equal(response.cookies.get('passwordChangeToken'), undefined);
    });
  }

  test('an out-of-contract status gets a generic French message', async () => {
    bff.on('POST', '/auth/force_change_password', { status: 409, raw: '', outOfContract: true });

    const response = await forceChangePassword.POST(changeRequest({ newPassword: 'NouveauMotDePasse123' }));

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), { message: 'Le mot de passe n’a pas pu être modifié.' });
  });

  test('an unreachable BFF yields 502 and a slow one 504', async () => {
    bff.on('POST', '/auth/force_change_password', { dropConnection: true });
    const dropped = await forceChangePassword.POST(changeRequest({ newPassword: 'NouveauMotDePasse123' }));
    assert.equal(dropped.status, 502);

    bff.on('POST', '/auth/force_change_password', { status: 204, delayMs: 500 });
    const slow = await withShortTimeouts(() => forceChangePassword.POST(changeRequest({ newPassword: 'NouveauMotDePasse123' })));
    assert.equal(slow.status, 504);
  });
});

describe('catch-all proxy → every BFF operation of the contract', () => {
  const context = (pathname) => ({ params: Promise.resolve({ path: pathname.split('/').filter(Boolean).map(decodeURIComponent) }) });

  function concretePath({ template, operation }) {
    const parameters = operation.parameters ?? [];
    const pathname = template.replace(/\{([^}]+)\}/g, (_match, name) => {
      const parameter = parameters.find((candidate) => candidate.in === 'path' && candidate.name === name);
      return encodeURIComponent(String(parameter?.schema ? contract.sample(parameter.schema, name) : 1));
    });
    const query = new URLSearchParams(parameters.filter((parameter) => parameter.in === 'query')
      .map((parameter) => [parameter.name, String(parameter.schema ? contract.sample(parameter.schema, parameter.name) : 'x')]));
    return { pathname, search: query.size ? `?${query}` : '' };
  }

  test('the App Router catch-all exports the proxy for every method declared in the contract', () => {
    const declared = new Set(contract.operations().map(({ method }) => method));
    for (const method of [...declared, 'HEAD']) assert.equal(catchAll[method], proxy.proxyBffRequest, `${method} non exporté par src/app/[...path]/route.ts`);
  });

  for (const operation of contract.operations()) {
    test(`${operation.method} ${operation.template} reaches the BFF unchanged and its response comes back`, async () => {
      const [status, response] = Object.entries(operation.operation.responses).find(([code]) => code.startsWith('2'));
      const schema = response.content?.['application/json']?.schema;
      const replyBody = schema ? contract.sample(schema, 'reply') : undefined;
      const replyHeaders = Object.fromEntries(Object.keys(response.headers ?? {}).map((name) => [name, `${name}-value`]));
      bff.on(operation.method, operation.template, { status: Number(status), body: replyBody, headers: replyHeaders });
      const bodySchema = operation.operation.requestBody?.content?.['application/json']?.schema;
      const requestBody = bodySchema ? contract.sample(bodySchema, 'request') : undefined;
      const { pathname, search } = concretePath(operation);

      const result = await catchAll[operation.method](new NextRequest(`http://localhost:5000${pathname}${search}`, {
        method: operation.method,
        headers: { cookie: 'accessToken=session-token; other=1', 'x-nonce': 'page-nonce', ...(requestBody ? { 'Content-Type': 'application/json' } : {}) },
        ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
      }), context(pathname));

      assert.equal(result.status, Number(status));
      assert.equal(result.headers.get('cache-control'), 'no-store');
      for (const name of Object.keys(replyHeaders)) assert.equal(result.headers.get(name), replyHeaders[name]);
      if (replyBody === undefined) assert.equal(await result.text(), '');
      else assert.deepEqual(await result.json(), replyBody);
      const calls = bff.calls(operation.template, operation.method);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url.pathname + calls[0].url.search, pathname + search);
      assert.deepEqual(calls[0].undeclaredQuery, []);
      assert.equal(calls[0].headers.authorization, 'Bearer session-token');
      assert.equal(calls[0].headers.cookie, undefined);
      assert.equal(calls[0].headers['x-nonce'], undefined);
      assert.deepEqual(calls[0].body, requestBody);
    });
  }

  test('methods absent from the contract are refused with Allow before reaching the BFF', async () => {
    for (const [template, item] of Object.entries(contract.document.paths)) {
      const declared = Object.keys(item).map((method) => method.toUpperCase());
      const { pathname } = concretePath({ template, operation: Object.values(item)[0] });
      for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((candidate) => !declared.includes(candidate))) {
        const result = await catchAll[method](new NextRequest(`http://localhost:5000${pathname}`, { method }), context(pathname));
        assert.equal(result.status, 405, `${method} ${template}`);
        assert.deepEqual(result.headers.get('allow').split(', ').sort(), [...declared, ...(declared.includes('GET') ? ['HEAD'] : [])].sort());
      }
    }
    assert.equal(bff.requests.length, 0);
  });

  test('paths absent from the contract or with dot segments never reach the BFF', async () => {
    for (const pathname of ['/unknown', '/auth', '/auth/login/extra', '/user/42', '/api/v1/user/me/', '/bff/admin/users/1/roles/2/extra']) {
      const result = await catchAll.GET(new NextRequest(`http://localhost:5000${pathname}`), context(pathname));
      assert.equal(result.status, 404, pathname);
    }
    const traversal = await catchAll.GET(new NextRequest('http://localhost:5000/me'), { params: Promise.resolve({ path: ['user', '..', 'me'] }) });
    assert.equal(traversal.status, 400);
    assert.equal(bff.requests.length, 0);
  });

  test('HEAD is forwarded as the declared GET without a body', async () => {
    bff.on('GET', '/me', { body: contract.sample(contract.schema('SessionResponse')) });

    const result = await catchAll.HEAD(new NextRequest('http://localhost:5000/me', { method: 'HEAD', headers: { cookie: 'accessToken=session-token' } }), context('/me'));

    assert.equal(result.status, 200);
    assert.equal(await result.text(), '');
    assert.equal(bff.calls('/me', 'HEAD').length, 1);
  });

  test('the BFF OpenAPI document is always relayed', async () => {
    const result = await catchAll.GET(new NextRequest('http://localhost:5000/openapi.json'), context('/openapi.json'));

    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { openapi: '3.1.0' });
    const refused = await catchAll.POST(new NextRequest('http://localhost:5000/openapi.json', { method: 'POST' }), context('/openapi.json'));
    assert.equal(refused.status, 405);
  });

  test('without session cookie no Authorization is invented, and documented empty 401 bodies stay empty', async () => {
    bff.on('GET', '/session/me', (request) => ({ status: request.headers.authorization ? 200 : 401 }));

    const result = await catchAll.GET(new NextRequest('http://localhost:5000/session/me'), context('/session/me'));

    assert.equal(result.status, 401);
    assert.equal(await result.text(), '');
    assert.equal(bff.calls('/session/me')[0].headers.authorization, undefined);
  });

  test('BFF errors, their message and Set-Cookie are relayed', async () => {
    bff.on('POST', '/auth/logout', { status: 500, body: { message: 'Erreur serveur' }, headers: { 'Set-Cookie': 'accessToken=; Max-Age=0; Path=/; HttpOnly' } });

    const result = await catchAll.POST(new NextRequest('http://localhost:5000/auth/logout', { method: 'POST', headers: { cookie: 'accessToken=session-token' } }), context('/auth/logout'));

    assert.equal(result.status, 500);
    assert.deepEqual(await result.json(), { message: 'Erreur serveur' });
    assert.match(result.headers.get('set-cookie'), /Max-Age=0/);
  });

  test('an unreachable or dropping BFF yields a controlled 502', async () => {
    bff.on('GET', '/me', { dropConnection: true });
    const dropped = await catchAll.GET(new NextRequest('http://localhost:5000/me'), context('/me'));
    assert.equal(dropped.status, 502);
    assert.deepEqual(await dropped.json(), { error: { message: 'Le service est indisponible.' } });

    const offline = await unreachableUrl();
    allowedOrigins = [offline];
    process.env.BFF_USER_API_URL = offline;
    const refused = await catchAll.GET(new NextRequest('http://localhost:5000/health'), context('/health'));
    assert.equal(refused.status, 502);
  });
});
