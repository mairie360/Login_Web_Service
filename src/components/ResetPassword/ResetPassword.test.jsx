import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PASSWORD_POLICY_MESSAGE } from '@/lib/password-recovery-validation';
import ResetPassword from './ResetPassword';
import source from './ResetPassword.tsx?raw';

describe('ResetPassword', () => {
  it('asks for a new link without a valid token', () => {
    render(<ResetPassword />);
    // MAIR-1261 (F4 Cas 1): the mock-up's title and description.
    expect(screen.getByRole('alert').textContent).toBe('Lien invalide ou expiré.Demandez un nouveau lien pour continuer.');
    expect(screen.getByRole('link', { name: 'Demander un nouveau lien' }).getAttribute('href')).toBe('/forgot-password');
    expect(screen.queryByLabelText('Nouveau mot de passe')).toBeNull();
  });
  it('checks the passwords before any request', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(<ResetPassword token={crypto.randomUUID()} />);
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'motdepasse-12345' } });
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'motdepasse-67890' } });
    fireEvent.submit(document.querySelector('form'));
    // MAIR-1261 (F4 Cas 3): the mismatch is said under the confirmation field.
    expect(screen.getByRole('alert').textContent).toBe('Les deux mots de passe ne correspondent pas.');
    expect(screen.getByLabelText('Confirmer le mot de passe').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(screen.getByLabelText('Confirmer le mot de passe'));
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('MAIR-757 shows the password policy when the reset is refused with a 400, and keeps the form', async () => {
    const fetchMock = vi.fn(async () => Response.json({ message: PASSWORD_POLICY_MESSAGE }, { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<ResetPassword token={crypto.randomUUID()} />);
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'camille-mairie-2026' } });
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'camille-mairie-2026' } });
    fireEvent.submit(document.querySelector('form'));
    // MAIR-1261 (F4 Cas 4): « Mot de passe refusé. » with the whole policy as description.
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(`Mot de passe refusé.${PASSWORD_POLICY_MESSAGE}`));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Nouveau mot de passe')).not.toBeNull();
    vi.unstubAllGlobals();
  });
  it('MAIR-888 F4: no hand-written recovery* class and no 8-character rule is left in the page', () => {
    expect(source).not.toMatch(/recovery(Input|Button|Link)Class/);
    expect(source).not.toMatch(/length < 8/);
  });
});
