import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, frontUrl } from './config.mjs';
import { run } from './users.mjs';

/**
 * Navigateur d'un scénario. Une session = un contexte isolé (cookies séparés), pour jouer plusieurs
 * utilisateurs dans le même scénario.
 *
 *   const s = await openSession('admin');
 *   await s.goto('login');                 // https://login.<domaine>/
 *   await s.shot('01-formulaire');         // reports/<run>/<scenario>/admin-01-formulaire.png
 *   await s.close();
 */
export async function openSession(name, { scenario = 'adhoc' } = {}) {
  const dir = path.join(ROOT, 'reports', run().runId, scenario);
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  });
  const context = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1366, height: 850 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 300)));
  page.on('response', (r) => r.status() >= 500 && failedRequests.push(`${r.status()} ${new URL(r.url()).pathname}`));
  return {
    name,
    page,
    context,
    consoleErrors,
    failedRequests,
    goto: (front, pathname = '/') => page.goto(`${frontUrl(front)}${pathname}`, { waitUntil: 'networkidle' }),
    shot: (label) => page.screenshot({ path: path.join(dir, `${name}-${label}.png`), fullPage: true }),
    cookies: async () => (await context.cookies()).map(({ name: n, domain, path: p, httpOnly, secure, sameSite, expires }) => ({ n, domain, p, httpOnly, secure, sameSite, expires })),
    close: () => browser.close(),
  };
}

/**
 * Connexion par l'interface. Les libellés sont cherchés par rôle/texte; si l'UI change,
 * c'est ici (et seulement ici) qu'il faut ajuster.
 */
export async function loginViaUi(session, email, password) {
  const { page } = session;
  await session.goto('login');
  await page.getByLabel(/e-?mail/i).fill(email);
  await page.getByLabel(/mot de passe/i).first().fill(password);
  await page.getByRole('button', { name: /connexion|se connecter|connecter/i }).click();
}
