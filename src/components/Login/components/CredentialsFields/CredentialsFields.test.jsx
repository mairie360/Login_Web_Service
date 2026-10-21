import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
});
