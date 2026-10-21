import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginSubmit, loginSubmitLabel } from './LoginSubmit';

describe('LoginSubmit', () => {
  it('labels each step and is disabled while loading', () => {
    const { rerender } = render(<LoginSubmit loading={false} passwordChange={false} />);
    expect(screen.getByRole('button', { name: 'Se connecter' }).getAttribute('type')).toBe('submit');
    rerender(<LoginSubmit loading passwordChange={false} />);
    expect(screen.getByRole('button').disabled).toBe(true);
    expect([loginSubmitLabel(false, true), loginSubmitLabel(true, true), loginSubmitLabel(true, false)])
      .toEqual(['Modifier le mot de passe', 'Modification…', 'Connexion…']);
  });
});
