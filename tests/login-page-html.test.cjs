const assert = require('node:assert/strict');
const path = require('node:path');
const { after, afterEach, before, beforeEach, test } = require('node:test');
const { requireTs } = require('./support/load-ts.cjs');
const { installReactRuntime, mount, stubModule } = require('./support/server-view.cjs');

// HTML of the sign-in page (src/app/page.tsx → src/components/Login.tsx) rendered with react-dom/server
// against the mocked BFF User: the real component is rendered, the hook state is kept between render passes
// (tests/support/server-view.cjs), the form submissions go through the real route handlers of src/app/api/auth
// (tests/support/browser-front.cjs) and the markup reflects what BFF User answered.

installReactRuntime();
const React = require('react');
// `next/image` computes its `src` through the Next.js image loader configuration, which only exists inside a
// Next.js runtime: the logo is rendered as the plain <img> the optimiser would wrap.
stubModule('next/image', { __esModule: true, default: ({ src, alt, width, height, className }) => React.createElement('img', { src, alt, width, height, className }) });
const { OpenApiContract } = require('./support/openapi-contract.cjs');
const { ContractMockServer } = require('./support/contract-mock-server.cjs');
const { BrowserFront, USER_AGENT } = require('./support/browser-front.cjs');

const contract = OpenApiContract.load(path.join(__dirname, '..', 'contracts', 'openapi.json'));
const bff = new ContractMockServer('BFF_USER', contract);
const front = new BrowserFront(bff);
let Home;
let resolveLoginRedirect;
let view;
let window;
const savedProjectUrl = process.env.PROJECT_FRONT_URL;

before(async () => {
  await bff.start();
  front.install();
  Home = requireTs('src/app/page.tsx').default;
  resolveLoginRedirect = requireTs('src/lib/login-redirect.ts').resolveLoginRedirect;
});
after(async () => {
  front.uninstall();
  await bff.stop();
});
beforeEach(() => {
  process.env.PROJECT_FRONT_URL = 'https://projects.mairie.test/';
  bff.reset();
  front.reset();
  window = { location: { assigned: [], assign(href) { this.assigned.push(href); } } };
  global.window = window;
});
afterEach(() => {
  if (savedProjectUrl === undefined) delete process.env.PROJECT_FRONT_URL;
  else process.env.PROJECT_FRONT_URL = savedProjectUrl;
  view?.unmount();
  view = undefined;
  delete global.window;
  assert.deepEqual([...bff.violations, ...front.violations], []);
});

const apiError = (status, message) => ({ status, body: { code: 'UPSTREAM_ERROR', message }, outOfContract: true });
const upstream = () => bff.requests.map((request) => `${request.method} ${request.template} ${request.headers.cookie ? 'cookie' : 'no-cookie'}`);
const typeInto = (id, value) => view.fire((props) => props.id === id, 'onChange', { target: { value } });
const submit = () => view.fire((props, text, tag) => tag === 'form', 'onSubmit');
const renderLogin = async (searchParams = {}) => {
  view = mount(await Home({ searchParams: Promise.resolve(searchParams) }));
};

test('missing or invalid default destinations render an unavailable state without a sign-in form', async () => {
  for (const value of [undefined, '', '  ', 'http://%', 'ftp://projects.mairie.test/', 'https://user:password@projects.mairie.test/']) {
    if (value === undefined) delete process.env.PROJECT_FRONT_URL;
    else process.env.PROJECT_FRONT_URL = value;
    await renderLogin();
    assert.match(view.text(), /Connexion temporairement indisponible/);
    assert.doesNotMatch(view.html, /<form|localhost/);
    assert.deepEqual(front.browserCalls, []);
    view.unmount();
    view = undefined;
  }
});

test('an explicitly allowed return destination works even without a default Projects URL', async () => {
  const previous = process.env.CALENDAR_FRONT_URL;
  delete process.env.PROJECT_FRONT_URL;
  process.env.CALENDAR_FRONT_URL = '  https://calendar.mairie.test/  ';
  try {
    const target = 'https://calendar.mairie.test/events?id=42';
    assert.equal(resolveLoginRedirect(target), target);
    await renderLogin({ redirect: target });
    assert.match(view.html, /<form/);
    process.env.CALENDAR_FRONT_URL = 'https://user:password@calendar.mairie.test/';
    assert.equal(resolveLoginRedirect(target), undefined);
  } finally {
    if (previous === undefined) delete process.env.CALENDAR_FRONT_URL;
    else process.env.CALENDAR_FRONT_URL = previous;
  }
});

test('the page renders the sign-in form, ready to post to the same origin', async () => {
  await renderLogin();

  assert.equal(view.passes, 1);
  assert.match(view.html, /<img[^>]*alt="Logo"/);
  assert.match(view.html, /<form[^>]*method="post"/);
  assert.match(view.html, /<h2[^>]*>Connexion<\/h2>/);
  assert.match(view.html, /<label for="email"[^>]*>Email professionnel<\/label>/);
  assert.match(view.html, /<input id="email" type="email"[^>]*placeholder="exemple@domaine\.com" required=""[^>]*name="email" value=""/);
  assert.match(view.html, /<input id="password" type="password"[^>]*required=""[^>]*name="password" value=""/);
  assert.match(view.html, /<button type="submit" class="btn btn-md btn-primary">Se connecter<\/button>/);
  assert.doesNotMatch(view.html, /role="(alert|status)"/);
  assert.match(view.text(), /© 2026 Mairie360\. Tous droits réservés\./);
});

test('redirect only accepts an absolute URL on a configured front origin', () => {
  const previous = process.env.CALENDAR_FRONT_URL;
  process.env.CALENDAR_FRONT_URL = 'https://calendar.mairie.test/';
  try {
    const fallback = 'https://projects.mairie.test/';
    assert.equal(resolveLoginRedirect('https://calendar.mairie.test/events?id=42'), 'https://calendar.mairie.test/events?id=42');
    for (const candidate of [undefined, ['https://calendar.mairie.test/'], '//evil.com', 'javascript:alert(1)', 'http://%', 'https://evil.com/', 'https://calendar.mairie.test.evil.com/', 'https://user@calendar.mairie.test/']) {
      assert.equal(resolveLoginRedirect(candidate), fallback);
    }
  } finally {
    if (previous === undefined) delete process.env.CALENDAR_FRONT_URL;
    else process.env.CALENDAR_FRONT_URL = previous;
  }
});

test('invalid configured front URLs never authorize a redirect', () => {
  const previousCalendar = process.env.CALENDAR_FRONT_URL;
  const previousEmail = process.env.EMAIL_FRONT_URL;
  const previousProject = process.env.PROJECT_FRONT_URL;
  process.env.CALENDAR_FRONT_URL = 'http://%';
  process.env.EMAIL_FRONT_URL = 'ftp://files.mairie.test/';
  try {
    const fallback = 'https://projects.mairie.test/';
    assert.equal(resolveLoginRedirect('https://calendar.mairie.test/events'), fallback);
    assert.equal(resolveLoginRedirect('https://files.mairie.test/'), fallback);
    process.env.PROJECT_FRONT_URL = 'http://%';
    assert.equal(resolveLoginRedirect('https://calendar.mairie.test/events'), undefined);
  } finally {
    if (previousCalendar === undefined) delete process.env.CALENDAR_FRONT_URL;
    else process.env.CALENDAR_FRONT_URL = previousCalendar;
    if (previousEmail === undefined) delete process.env.EMAIL_FRONT_URL;
    else process.env.EMAIL_FRONT_URL = previousEmail;
    if (previousProject === undefined) delete process.env.PROJECT_FRONT_URL;
    else process.env.PROJECT_FRONT_URL = previousProject;
  }
});

test('a successful sign-in returns to the requested page', async () => {
  const previous = process.env.CALENDAR_FRONT_URL;
  process.env.CALENDAR_FRONT_URL = 'https://calendar.mairie.test/';
  try {
    bff.on('POST', '/auth/login', { body: { refresh_token: 'refresh-token' }, headers: { Authorization: 'Bearer access-token' } });
    await renderLogin({ redirect: 'https://calendar.mairie.test/events?id=42' });
    await typeInto('email', 'alice@mairie.test');
    await typeInto('password', 'S3cret!');
    await submit();
    await view.waitFor((current) => current.includes('Connexion réussie.'));
    assert.deepEqual(window.location.assigned, ['https://calendar.mairie.test/events?id=42']);
  } finally {
    if (previous === undefined) delete process.env.CALENDAR_FRONT_URL;
    else process.env.CALENDAR_FRONT_URL = previous;
  }
});

test('an empty submission is refused in the page without any network call', async () => {
  await renderLogin();

  await submit();

  assert.match(view.html, /<p role="alert"[^>]*>Veuillez renseigner votre email et votre mot de passe\.<\/p>/);
  assert.deepEqual(front.browserCalls, []);
  assert.deepEqual(bff.requests, []);
});

test('valid credentials sign the user in: the cookie is set, the success is rendered and the browser leaves', async () => {
  bff.on('POST', '/auth/login', { body: { refresh_token: 'refresh-token' }, headers: { Authorization: 'Bearer access-token' } });
  await renderLogin();

  await typeInto('email', '  alice@mairie.test ');
  await typeInto('password', 'S3cret!');
  assert.match(view.html, /<input id="email"[^>]*value="  alice@mairie\.test "/);
  assert.match(view.html, /<input id="password"[^>]*value="S3cret!"/);

  await submit();
  const html = await view.waitFor((current) => current.includes('role="status"'));

  assert.match(html, /<p role="status"[^>]*>Connexion réussie\.<\/p>/);
  assert.match(html, /<input id="password"[^>]*value=""/, 'the password is cleared once sent');
  assert.match(html, /<button type="submit" class="btn btn-md btn-primary">Se connecter<\/button>/);
  assert.deepEqual(front.browserCalls, [{ method: 'POST', path: '/api/auth/login' }]);
  assert.deepEqual(upstream(), ['POST /auth/login no-cookie']);
  assert.deepEqual(bff.requests[0].body, { email: 'alice@mairie.test', password: 'S3cret!', device_info: USER_AGENT });
  assert.equal(front.cookies.get('accessToken'), 'access-token');
  assert.deepEqual(window.location.assigned, ['https://projects.mairie.test/']);
});

test('refused credentials are rendered as the page message, without a session', async () => {
  bff.on('POST', '/auth/login', apiError(401, 'Upstream service error'));
  await renderLogin();

  await typeInto('email', 'alice@mairie.test');
  await typeInto('password', 'wrong');
  await submit();
  const html = await view.waitFor((current) => current.includes('role="alert"'));

  assert.match(html, /<p role="alert"[^>]*>Email ou mot de passe incorrect\.<\/p>/);
  assert.equal(front.cookies.get('accessToken'), undefined);
  assert.deepEqual(window.location.assigned, []);
  assert.match(html, /<button type="submit" class="btn btn-md btn-primary">Se connecter<\/button>/);
});

test('a first connection switches to the password change form, then signs in with the new password', async () => {
  let logins = 0;
  bff.on('POST', '/auth/login', () => (logins++ === 0
    ? { status: 412, body: { token: 'first-connection-token' } }
    : { body: { refresh_token: 'refresh-token' }, headers: { Authorization: 'Bearer fresh-access-token' } }));
  bff.on('POST', '/auth/force_change_password', { status: 204 });
  await renderLogin({ redirect: 'https://projects.mairie.test/projects?view=board' });

  await typeInto('email', 'alice@mairie.test');
  await typeInto('password', 'temporary');
  await submit();
  const change = await view.waitFor((current) => current.includes('Nouveau mot de passe'));

  assert.match(change, /<h2[^>]*>Nouveau mot de passe<\/h2>/);
  assert.match(change, /Pour finaliser votre première connexion, choisissez un nouveau mot de passe\./);
  assert.match(change, /<input id="new-password"[^>]*type="password"/);
  assert.match(change, /<input id="new-password-confirmation"[^>]*type="password"/);
  assert.match(change, /<button type="submit" class="btn btn-md btn-primary">Modifier le mot de passe<\/button>/);
  assert.doesNotMatch(change, /id="email"/);
  assert.equal(front.cookies.get('passwordChangeToken'), 'first-connection-token', 'the one-time token stays in an HttpOnly cookie');
  assert.equal(front.cookies.get('accessToken'), undefined);

  await typeInto('new-password', 'N3w-secret');
  await typeInto('new-password-confirmation', 'other');
  await submit();
  assert.match(view.html, /<p role="alert"[^>]*>Les mots de passe ne correspondent pas\.<\/p>/);
  assert.deepEqual(upstream(), ['POST /auth/login no-cookie']);

  await typeInto('new-password-confirmation', 'N3w-secret');
  await submit();
  const html = await view.waitFor((current) => current.includes('Connexion réussie.'));

  assert.match(html, /<h2[^>]*>Connexion<\/h2>/);
  assert.match(html, /<p role="status"[^>]*>Connexion réussie\.<\/p>/);
  assert.deepEqual(front.browserCalls.map((call) => call.path), ['/api/auth/login', '/api/auth/force_change_password', '/api/auth/login']);
  assert.deepEqual(upstream(), ['POST /auth/login no-cookie', 'POST /auth/force_change_password no-cookie', 'POST /auth/login no-cookie']);
  assert.equal(bff.requests[2].body.password, 'N3w-secret');
  assert.equal(front.cookies.get('accessToken'), 'fresh-access-token');
  assert.deepEqual(window.location.assigned, ['https://projects.mairie.test/projects?view=board']);
});

test('an unreachable BFF is rendered as the unavailable-service message', async () => {
  bff.on('POST', '/auth/login', { dropConnection: true });
  await renderLogin();

  await typeInto('email', 'alice@mairie.test');
  await typeInto('password', 'S3cret!');
  await submit();
  const html = await view.waitFor((current) => current.includes('role="alert"'));

  assert.match(html, /<p role="alert"[^>]*>Le service de connexion est indisponible\.<\/p>/);
  assert.equal(front.cookies.get('accessToken'), undefined);
});
