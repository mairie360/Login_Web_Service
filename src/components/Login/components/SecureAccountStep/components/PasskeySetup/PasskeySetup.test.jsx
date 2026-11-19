import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasskeySetup } from './index';

const props = (extra = {}) => ({ label: '', onLabelChange: vi.fn(), fieldError: '', alert: null, onDismissAlert: vi.fn(), isSubmitting: false, onSubmit: vi.fn((event) => event.preventDefault()), backLabel: 'Choisir une autre méthode', onBack: vi.fn(), ...extra });

describe('PasskeySetup', () => {
  it('asks for the name of the passkey, required, and posts without putting anything in the URL', () => {
    const p = props();
    render(<PasskeySetup {...p} />);
    expect(screen.getByRole('heading', { name: 'Créer une passkey' })).toBeTruthy();
    const field = screen.getByLabelText(/Nom de la passkey/);
    expect(field.getAttribute('placeholder')).toBe('Ordinateur du bureau');
    expect(field.hasAttribute('required')).toBe(true);
    expect(document.querySelector('form').getAttribute('method')).toBe('post');
    fireEvent.change(field, { target: { value: 'Téléphone' } });
    expect(p.onLabelChange).toHaveBeenCalledWith('Téléphone');
    fireEvent.submit(document.querySelector('form'));
    expect(p.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows the field error and the alert, which can be dismissed', () => {
    const p = props({ fieldError: 'Donnez un nom à votre passkey.', alert: { title: 'La passkey n’a pas pu être vérifiée.' } });
    render(<PasskeySetup {...p} />);
    expect(screen.getByText('Donnez un nom à votre passkey.')).toBeTruthy();
    expect(screen.getByText('La passkey n’a pas pu être vérifiée.')).toBeTruthy();
  });

  it('locks the field and the way back while the browser ceremony runs', () => {
    render(<PasskeySetup {...props({ isSubmitting: true })} />);
    expect(screen.getByLabelText(/Nom de la passkey/).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Choisir une autre méthode' }).hasAttribute('disabled')).toBe(true);
  });

  it('leaves through the back button with the label it was given', () => {
    const p = props({ backLabel: 'Retour à la connexion' });
    render(<PasskeySetup {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
    expect(p.onBack).toHaveBeenCalledTimes(1);
  });
});
