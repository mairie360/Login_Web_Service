import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthenticatorSetup } from './index';

const base = { showSteps: true, enrolment: { secret: 'EXAMPLEKEYEXAMPL', otpauthUri: 'otpauth://totp/Mairie360:a@b.test?secret=EXAMPLEKEYEXAMPL' }, isStarting: false, code: '', onCodeChange: vi.fn(), fieldError: '', alert: null, onDismissAlert: vi.fn(), isSubmitting: false, locked: false, onSubmit: vi.fn((event) => event.preventDefault()), onBack: vi.fn() };

describe('AuthenticatorSetup', () => {
  it('shows the step, the key in groups of four and the verify button', () => {
    render(<AuthenticatorSetup {...base} />);
    expect(screen.getByText('ÉTAPE 1 SUR 2')).toBeTruthy();
    expect(screen.getByText('EXAM PLEK EYEX AMPL')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Vérifier et continuer' })).toBeTruthy();
  });
  it('hides the step counter and the field while the secret is being prepared', () => {
    render(<AuthenticatorSetup {...base} showSteps={false} enrolment={null} isStarting />);
    expect(screen.queryByText('ÉTAPE 1 SUR 2')).toBeNull();
    expect(screen.queryByLabelText(/Code affiché par l’application/)).toBeNull();
  });
  it('submits the form and goes back', () => {
    render(<AuthenticatorSetup {...base} />);
    fireEvent.submit(document.querySelector('form'));
    fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
    expect(base.onSubmit).toHaveBeenCalledTimes(1);
    expect(base.onBack).toHaveBeenCalledTimes(1);
  });
});
