import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RESET_EXPIRED_MESSAGE } from '@/lib/password-recovery-validation';
import ResetPassword from './ResetPassword';

describe('ResetPassword', () => {
  it('asks for a new link without a valid token', () => {
    render(<ResetPassword />);
    expect(screen.getByRole('alert').textContent).toBe(RESET_EXPIRED_MESSAGE);
    expect(screen.getByRole('link', { name: 'Demander un nouveau lien' }).getAttribute('href')).toBe('/forgot-password');
    expect(screen.queryByLabelText('Nouveau mot de passe')).toBeNull();
  });
  it('checks the passwords before any request', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(<ResetPassword token={crypto.randomUUID()} />);
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'motdepasse1' } });
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'motdepasse2' } });
    fireEvent.submit(document.querySelector('form'));
    expect(screen.getByRole('alert').textContent).toBe('Les mots de passe ne correspondent pas.');
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
