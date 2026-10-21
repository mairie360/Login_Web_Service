import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ForgotPassword from './ForgotPassword';

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
});
