import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
});
