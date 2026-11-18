import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';
import source from './Login.tsx?raw';

describe('Login', () => {
  it('shows the sign-in card and refuses an empty submission without any request', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(<Login />);
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Mot de passe oublié ?' }).getAttribute('href')).toBe('/forgot-password');
    expect(screen.queryByText('Se connecter avec le compte unique')).toBeNull();
    fireEvent.submit(document.querySelector('form'));
    expect(screen.getByRole('alert').textContent).toContain('Veuillez renseigner votre email et votre mot de passe.');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('MAIR-866 F1: forgot-password is a lib link that keeps the requested module, and no « ou » appears without a passkey', () => {
    render(<Login redirectUrl="https://projects.example.test/?p=1" />);
    const link = screen.getByRole('link', { name: 'Mot de passe oublié ?' });
    expect(link.getAttribute('href')).toBe('/forgot-password?redirect=https%3A%2F%2Fprojects.example.test%2F%3Fp%3D1');
    expect(link.getAttribute('data-m360-component')).toContain('LinkButton');
    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('MAIR-866 F1: the passkey slot sits under the main action after an « ou » separator', () => {
    render(<Login passkeySlot={<button type="button">Se connecter avec une passkey</button>} />);
    const separator = screen.getByRole('separator', { name: 'ou' });
    const main = screen.getByRole('button', { name: 'Se connecter' });
    const passkey = screen.getByRole('button', { name: 'Se connecter avec une passkey' });
    expect(main.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(separator.compareDocumentPosition(passkey) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('MAIR-866 F1: the card is built from lib components only (no local field, no CSS-class link)', () => {
    expect(source).not.toMatch(/LoginField|<a\b/);
  });

  describe('MAIR-806 second step of a protected account', () => {
    const reply = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
    const signIn = () => {
      fireEvent.change(screen.getByLabelText(/Email professionnel/), { target: { value: 'alice@example.test' } });
      fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'fixture-password' } });
      fireEvent.submit(document.querySelector('form'));
    };

    it('business journey: password, then the code, then the requested module', async () => {
      const navigate = vi.fn();
      const fetchMock = vi.fn((url) => (url === '/api/auth/login' ? reply(200, { requiresTwoFactor: true }) : reply(200, { success: true })));
      vi.stubGlobal('fetch', fetchMock);
      render(<Login redirectUrl="https://projects.example.test/" navigate={navigate} />);
      signIn();
      expect(await screen.findByRole('heading', { name: 'Code de vérification' })).toBeTruthy();
      expect(screen.queryByLabelText(/Mot de passe/)).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText(/Code de vérification/), { target: { value: '492039' } });
      fireEvent.submit(document.querySelector('form'));
      await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://projects.example.test/'));
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/auth/login', '/api/auth/login/2fa']);
      vi.unstubAllGlobals();
    });

    it('case 4: a login session that is over shows the sign-in form again with its alert', async () => {
      const fetchMock = vi.fn((url) => (url === '/api/auth/login' ? reply(200, { requiresTwoFactor: true }) : reply(401, { message: 'Votre session de connexion a expiré.', restartLogin: true })));
      vi.stubGlobal('fetch', fetchMock);
      render(<Login redirectUrl="https://projects.example.test/" navigate={vi.fn()} />);
      signIn();
      await screen.findByRole('heading', { name: 'Code de vérification' });
      fireEvent.change(screen.getByLabelText(/Code de vérification/), { target: { value: '123456' } });
      fireEvent.submit(document.querySelector('form'));
      expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeTruthy();
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('Votre session de connexion a expiré.');
      expect(alert.textContent).toContain('Saisissez de nouveau votre email et votre mot de passe.');
      expect(screen.getByLabelText(/Mot de passe/).value).toBe('');
      vi.unstubAllGlobals();
    });

    it('« Retour à la connexion » shows the sign-in form again', async () => {
      vi.stubGlobal('fetch', vi.fn(() => reply(200, { requiresTwoFactor: true })));
      render(<Login navigate={vi.fn()} />);
      signIn();
      await screen.findByRole('heading', { name: 'Code de vérification' });
      fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeTruthy();
      vi.unstubAllGlobals();
    });
  });
});
