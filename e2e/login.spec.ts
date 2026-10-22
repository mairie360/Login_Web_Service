import { expect, test } from '@playwright/test';

// Critical journeys of the Login front (MAIR-603), on the real stack of docker-compose-e2e.yml
// (BFF User, Core API, seeded database): a returning agent signs in and is sent to the requested
// front, a first sign-in asks for a new password, wrong credentials and a sign-in posted from
// another site are refused. The texts asserted are the French ones displayed on screen.

// Seeded users of init-test.sql, both with the template password of the Database repository.
const PASSWORD = 'password_template';
const RETURNING_AGENT = 'perf-tester@mairie360.fr';
const FIRST_SIGN_IN = 'membre-lecteur@mairie360.fr';
// Front the agent asked for: not part of the stack, the browser request is answered here.
const DESTINATION = process.env.E2E_DASHBOARD_URL ?? 'http://dashboard.e2e.invalid/';

test.beforeEach(async ({ page }) => {
  await page.route(`${DESTINATION}**`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Tableau de bord</h1>' }));
  await page.goto(`/?redirect=${encodeURIComponent(DESTINATION)}`);
  await expect(page.getByRole('heading', { name: 'Connexion', level: 1 })).toBeVisible();
});

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.getByLabel('Email professionnel').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  const response = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/login');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  return response;
}

test('a returning agent signs in and is sent to the requested front', async ({ page }) => {
  const response = await signIn(page, RETURNING_AGENT, PASSWORD);
  expect(response.status()).toBe(200);
  // The shared session cookie the other fronts read, out of reach of scripts. Browser responses
  // only expose Set-Cookie through headerValue / allHeaders.
  const setCookie = (await response.headerValue('set-cookie')) ?? '';
  expect(setCookie).toMatch(/accessToken=[^;]+/);
  expect(setCookie).toMatch(/HttpOnly/i);

  await page.waitForURL(DESTINATION);
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
});

test('a first sign-in asks for a new password before opening a session', async ({ page }) => {
  const response = await signIn(page, FIRST_SIGN_IN, PASSWORD);
  expect(response.status()).toBe(200);
  expect((await response.headerValue('set-cookie')) ?? '').not.toMatch(/accessToken=/);

  await expect(page.getByRole('heading', { name: 'Nouveau mot de passe', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modifier le mot de passe' })).toBeVisible();
  expect(new URL(page.url()).origin).not.toBe(new URL(DESTINATION).origin);
});

test('wrong credentials are refused without a session', async ({ page }) => {
  const response = await signIn(page, RETURNING_AGENT, 'not-the-password');
  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect((await response.headerValue('set-cookie')) ?? '').not.toMatch(/accessToken=/);

  await expect(page.getByText('Email ou mot de passe incorrect.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Connexion', level: 1 })).toBeVisible();
});

test('a sign-in posted from another site is refused', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    headers: { Origin: 'https://attaquant.example', 'Sec-Fetch-Site': 'cross-site' },
    data: { email: RETURNING_AGENT, password: PASSWORD },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(403);
  expect(response.headers()['set-cookie'] ?? '').not.toMatch(/accessToken=/);
});
