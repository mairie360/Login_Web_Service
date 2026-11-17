import { fireEvent, render, screen } from '@testing-library/react';
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
});
