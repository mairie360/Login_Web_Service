import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';

describe('Login', () => {
  it('shows the sign-in card and refuses an empty submission without any request', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(<Login keycloakLoginUrl="https://sso.example/auth" />);
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Mot de passe oublié ?' }).getAttribute('href')).toBe('/forgot-password');
    expect(screen.getByRole('link', { name: 'Se connecter avec le compte unique' })).toBeTruthy();
    fireEvent.submit(document.querySelector('form'));
    expect(screen.getByRole('alert').textContent).toContain('Veuillez renseigner votre email et votre mot de passe.');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
