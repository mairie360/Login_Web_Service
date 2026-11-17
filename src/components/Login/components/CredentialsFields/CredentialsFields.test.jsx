import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CredentialsFields } from './CredentialsFields';

describe('CredentialsFields', () => {
  it('asks for the email and the current password', () => {
    const onEmailChange = vi.fn(); const onPasswordChange = vi.fn();
    render(<CredentialsFields email="" password="" disabled={false} onEmailChange={onEmailChange} onPasswordChange={onPasswordChange} />);
    expect(screen.getByLabelText('Email professionnel').getAttribute('placeholder')).toBe('exemple@domaine.com');
    expect(screen.getByLabelText('Mot de passe').getAttribute('autocomplete')).toBe('current-password');
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'secret' } });
    expect(onPasswordChange).toHaveBeenCalledWith('secret');
  });

  it('MAIR-866 F1: lib email and password fields with the passkey-ready autocomplete and the required marker', () => {
    render(<CredentialsFields email="" password="" disabled={false} onEmailChange={vi.fn()} onPasswordChange={vi.fn()} />);
    const email = screen.getByLabelText('Email professionnel');
    expect(email.getAttribute('autocomplete')).toBe('username webauthn');
    expect(email.required).toBe(true);
    expect(screen.getByLabelText('Mot de passe').required).toBe(true);
    expect(screen.getByRole('button', { name: 'Afficher le mot de passe' })).toBeTruthy();
  });
});
