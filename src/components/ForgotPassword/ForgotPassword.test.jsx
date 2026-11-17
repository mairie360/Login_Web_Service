import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';
import source from './ForgotPassword.tsx?raw';

describe('ForgotPassword', () => {
  it('refuses an invalid email before any request and links back to the sign-in', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(<ForgotPassword redirectUrl="https://dashboard.example.test/" />);
    expect(screen.getByRole('heading', { name: 'Mot de passe oublié' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Email professionnel'), { target: { value: 'pas-un-email' } });
    fireEvent.submit(document.querySelector('form'));
    expect(screen.getByRole('alert').textContent).toBe('Veuillez renseigner une adresse email valide.');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Retour à la connexion' }).getAttribute('href')).toBe('/?redirect=https%3A%2F%2Fdashboard.example.test%2F');
    vi.unstubAllGlobals();
  });

  it('MAIR-881 F3: uses the lib components, a dismissible error and a disabled confirmation state', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) }).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) });
    const { container } = render(<ForgotPassword />);
    expect(container.querySelector('[data-m360-component="EmailField"], [data-preset="Email"]')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Envoyer le lien' }).getAttribute('data-m360-component')).toContain('Button');
    fireEvent.change(screen.getByLabelText('Email professionnel'), { target: { value: 'agent@example.test' } });
    fireEvent.submit(document.querySelector('form'));
    expect((await screen.findByRole('alert')).textContent).toContain('Trop de demandes');
    fireEvent.click(screen.getByRole('button', { name: 'Fermer le message' }));
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Si un compte existe, un e-mail a été envoyé.'));
    expect(screen.getByLabelText('Email professionnel').disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Envoyer le lien' }).disabled).toBe(true);
    vi.unstubAllGlobals();
  });

  it('MAIR-881 F3: no hand-written recovery* class is left in the page', () => {
    expect(source).not.toMatch(/recovery(Input|Button|Link)Class/);
  });
});
