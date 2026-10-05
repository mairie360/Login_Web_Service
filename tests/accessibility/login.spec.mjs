import { test, expect, modes, destination, credentials, updatedPassword, deferred, responses, enterCredentials, inspect } from './fixtures.mjs';

for (const mode of modes) {
  test.describe(mode.name, () => {
    test.use({ mode });

    test('sign-in labels, keyboard, required validation, pending and refused response', async ({ page, frontend }, info) => {
      const gate = deferred();
      const calls = await responses(page, frontend.origin, '/api/auth/login', [{ gate, status: 401, json: { message: 'Identifiants refusés.' } }]);
      try {
        await page.goto(frontend.origin);
        await expect(page).toHaveURL(`${frontend.origin}/`);
        await inspect(page, mode, info, 'sign-in');
        await page.keyboard.press('Tab');
        await expect(page.getByLabel('Email professionnel')).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.getByLabel('Mot de passe', { exact: true })).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'Se connecter' })).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.getByLabel('Email professionnel')).toBeFocused();
        expect(await page.getByLabel('Email professionnel').evaluate((input) => input.validity.valueMissing)).toBe(true);
        expect(calls).toEqual([]);
        await enterCredentials(page);
        await page.getByRole('button', { name: 'Se connecter' }).press('Enter');
        await expect(page.getByRole('button', { name: 'Connexion…' })).toBeDisabled();
        await expect(page.getByLabel('Email professionnel')).toBeDisabled();
        await expect(page.getByLabel('Mot de passe', { exact: true })).toBeDisabled();
        await expect(page.locator('form')).toHaveAttribute('aria-busy', 'true');
        await inspect(page, mode, info, 'sign-in-pending');
        gate.release();
        await expect(page.getByRole('main').getByRole('alert')).toHaveText('Identifiants refusés.');
        await inspect(page, mode, info, 'sign-in-refused');
        expect(calls).toEqual([credentials]);
        await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled();
        await expect(page.getByLabel('Email professionnel')).toBeEnabled();
        await expect(page.locator('form')).toHaveAttribute('aria-busy', 'false');
      } finally { gate.release(); }
    });

    test('mandatory password change, mismatch, pending, refused and expired restart', async ({ page, frontend }, info) => {
      await responses(page, frontend.origin, '/api/auth/login', [{ json: { requiresPasswordChange: true } }]);
      const gate = deferred();
      const changes = await responses(page, frontend.origin, '/api/auth/force_change_password', [
        { gate, status: 400, json: { message: 'Le nouveau mot de passe est refusé.' } },
        { status: 401, json: { message: 'Veuillez recommencer la connexion.', restartLogin: true } },
      ]);
      try {
        await page.goto(frontend.origin);
        await enterCredentials(page);
        await page.getByRole('button', { name: 'Se connecter' }).click();
        await expect(page.getByRole('heading', { name: 'Nouveau mot de passe' })).toBeVisible();
        await inspect(page, mode, info, 'mandatory-password');
        await page.getByLabel('Nouveau mot de passe', { exact: true }).focus();
        await page.keyboard.press('Tab');
        await expect(page.getByLabel('Confirmer le mot de passe')).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'Modifier le mot de passe' })).toBeFocused();
        await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(updatedPassword);
        await page.getByLabel('Confirmer le mot de passe').fill('mismatching-test-password');
        await page.getByRole('button', { name: 'Modifier le mot de passe' }).press('Enter');
        await expect(page.getByRole('main').getByRole('alert')).toHaveText('Les mots de passe ne correspondent pas.');
        expect(changes).toEqual([]);
        await inspect(page, mode, info, 'password-mismatch');
        await page.getByLabel('Confirmer le mot de passe').fill(updatedPassword);
        await page.getByRole('button', { name: 'Modifier le mot de passe' }).click();
        await expect(page.getByRole('button', { name: 'Modification…' })).toBeDisabled();
        await expect(page.getByLabel('Nouveau mot de passe', { exact: true })).toBeDisabled();
        await expect(page.getByLabel('Confirmer le mot de passe')).toBeDisabled();
        await inspect(page, mode, info, 'password-pending');
        gate.release();
        await expect(page.getByRole('main').getByRole('alert')).toHaveText('Le nouveau mot de passe est refusé.');
        await inspect(page, mode, info, 'password-refused');
        await page.getByRole('button', { name: 'Modifier le mot de passe' }).press('Enter');
        await expect(page.getByRole('heading', { name: 'Connexion', exact: true })).toBeVisible();
        await expect(page.getByRole('main').getByRole('alert')).toHaveText('Veuillez recommencer la connexion.');
        await inspect(page, mode, info, 'expired-password-restart');
        expect(changes).toEqual([{ newPassword: updatedPassword }, { newPassword: updatedPassword }]);
      } finally { gate.release(); }
    });

    test('first connection success feedback then Dashboard navigation', async ({ page, frontend }, info) => {
      const signInGate = deferred();
      const loginCalls = await responses(page, frontend.origin, '/api/auth/login', [
        { json: { requiresPasswordChange: true } }, { gate: signInGate, json: { success: true } },
      ]);
      const changes = await responses(page, frontend.origin, '/api/auth/force_change_password', [{ json: { success: true } }]);
      await page.route(destination, async (route) => {
        await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="fr"><title>Destination isolée</title><main><h1>Destination de test</h1></main></html>' });
      });
      try {
        await page.goto(frontend.origin);
        await enterCredentials(page);
        await page.getByRole('button', { name: 'Se connecter' }).click();
        await expect(page.getByRole('heading', { name: 'Nouveau mot de passe' })).toBeVisible();
        await page.getByLabel('Nouveau mot de passe', { exact: true }).fill(updatedPassword);
        await page.getByLabel('Confirmer le mot de passe').fill(updatedPassword);
        await page.getByRole('button', { name: 'Modifier le mot de passe' }).click();
        await expect(page.getByRole('status')).toHaveText('Mot de passe modifié. Connexion en cours…');
        await expect(page.getByLabel('Email professionnel')).toBeDisabled();
        await expect(page.getByLabel('Mot de passe', { exact: true })).toBeDisabled();
        await inspect(page, mode, info, 'password-success-reconnecting');
        signInGate.release();
        await expect(page).toHaveURL(destination);
        await expect(page.getByRole('heading', { name: 'Destination de test' })).toBeVisible();
        info.annotations.push({ type: 'remaining', description: 'Immediate location.assign navigation prevents a stable full-page axe scan of the transient Connexion réussie status; announcement is not certified.' });
        expect(loginCalls).toEqual([credentials, { email: credentials.email, password: updatedPassword }]);
        expect(changes).toEqual([{ newPassword: updatedPassword }]);
      } finally { signInGate.release(); }
    });

    test('connection unavailable transport feedback', async ({ page, frontend }, info) => {
      await responses(page, frontend.origin, '/api/auth/login', [{ abort: true }]);
      await page.goto(frontend.origin);
      await enterCredentials(page);
      await page.getByRole('button', { name: 'Se connecter' }).click();
      await expect(page.getByRole('main').getByRole('alert')).toHaveText('Impossible de joindre le service de connexion.');
      await inspect(page, mode, info, 'transport-unavailable');
    });

    test('sign-out pending, refusal, retry, local expiry refusal and final navigation', async ({ page, frontend }, info) => {
      const gate = deferred();
      const upstream = await responses(page, frontend.origin, '/auth/logout', [
        { gate, status: 503 }, { json: { success: true } }, { json: { success: true } },
      ]);
      const local = await responses(page, frontend.origin, '/api/auth/logout', [{ status: 503 }, { json: { success: true } }]);
      try {
        await page.goto(`${frontend.origin}/logout`);
        await expect(page.getByRole('status')).toHaveText('Déconnexion en cours…');
        await inspect(page, mode, info, 'sign-out-pending');
        gate.release();
        await expect(page.getByRole('main').getByRole('alert')).toHaveText('La déconnexion n’a pas abouti. Veuillez réessayer.');
        expect(local).toHaveLength(0);
        await inspect(page, mode, info, 'sign-out-refused');
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'Réessayer' })).toBeFocused();
        await page.keyboard.press('Enter');
        await expect.poll(() => local.length).toBe(1);
        await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
        await inspect(page, mode, info, 'local-expiry-refused');
        await page.getByRole('button', { name: 'Réessayer' }).press('Enter');
        await expect(page).toHaveURL(`${frontend.origin}/`);
        await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
        await inspect(page, mode, info, 'sign-out-success-return');
        expect(upstream).toHaveLength(3);
        expect(local).toHaveLength(2);
      } finally { gate.release(); }
    });

    test.describe('missing frontend destination', () => {
      test.use({ configured: false });
      test('unavailable configuration has meaningful standalone content', async ({ page, frontend }, info) => {
        await page.goto(frontend.origin);
        await expect(page.getByRole('heading', { name: 'Connexion temporairement indisponible' })).toBeVisible();
        await expect(page.locator('form')).toHaveCount(0);
        await inspect(page, mode, info, 'configuration-unavailable');
      });
    });
  });
}
