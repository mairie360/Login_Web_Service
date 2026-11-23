import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordChangeFields } from './PasswordChangeFields';

describe('PasswordChangeFields', () => {
  it('asks for the new password twice, disabled while loading', () => {
    render(<PasswordChangeFields password="" confirmation="" disabled onPasswordChange={vi.fn()} onConfirmationChange={vi.fn()} />);
    expect(screen.getByText(/finaliser votre première connexion/)).toBeTruthy();
    for (const label of ['Nouveau mot de passe', 'Confirmer le mot de passe']) {
      expect(screen.getByLabelText(label).getAttribute('autocomplete')).toBe('new-password');
      expect(screen.getByLabelText(label).disabled).toBe(true);
    }
  });

  it('MAIR-875 F2: shows the 12-character rule as help text and the rule error on the new password field', () => {
    const { rerender } = render(<PasswordChangeFields password="" confirmation="" disabled={false} onPasswordChange={vi.fn()} onConfirmationChange={vi.fn()} />);
    expect(screen.getByText('12 caractères minimum. Évitez les mots de passe courants, votre e-mail, votre prénom et votre nom.')).toBeTruthy();
    expect(screen.getByLabelText('Nouveau mot de passe').getAttribute('data-preset') ?? screen.getByLabelText('Nouveau mot de passe').closest('[data-preset]')?.getAttribute('data-preset')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    rerender(<PasswordChangeFields password="court1" confirmation="" disabled={false} passwordError="Utilisez au moins 12 caractères." onPasswordChange={vi.fn()} onConfirmationChange={vi.fn()} />);
    expect(screen.getByRole('alert').textContent).toContain('Utilisez au moins 12 caractères');
    expect(screen.getByLabelText('Nouveau mot de passe').getAttribute('aria-invalid')).toBe('true');
  });
});
