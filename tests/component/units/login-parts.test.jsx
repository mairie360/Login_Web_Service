import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CredentialsFields } from '@/components/login/CredentialsFields';
import { LoginFeedback } from '@/components/login/LoginFeedback';
import { LoginField } from '@/components/login/LoginField';
import { LoginSubmit, loginSubmitLabel } from '@/components/login/LoginSubmit';
import { PasswordChangeFields } from '@/components/login/PasswordChangeFields';
import { SingleAccountLink } from '@/components/login/SingleAccountLink';

describe('MAIR-608 login sub-components', () => {
  it('LoginField is a labelled required field named after its id', () => {
    const onChange = vi.fn();
    render(<LoginField id="email" label="Email professionnel" type="email" value="" autoComplete="email" disabled={false} onChange={onChange} />);
    const field = screen.getByLabelText('Email professionnel');
    expect(field.required).toBe(true);
    expect(field.getAttribute('name')).toBe('email');
    fireEvent.change(field, { target: { value: 'agent@mairie.fr' } });
    expect(onChange).toHaveBeenCalledWith('agent@mairie.fr');
  });

  it('CredentialsFields asks for the email and the current password', () => {
    const onEmailChange = vi.fn(); const onPasswordChange = vi.fn();
    render(<CredentialsFields email="" password="" disabled={false} onEmailChange={onEmailChange} onPasswordChange={onPasswordChange} />);
    expect(screen.getByLabelText('Email professionnel').getAttribute('placeholder')).toBe('exemple@domaine.com');
    expect(screen.getByLabelText('Mot de passe').getAttribute('autocomplete')).toBe('current-password');
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'secret' } });
    expect(onPasswordChange).toHaveBeenCalledWith('secret');
  });

  it('PasswordChangeFields asks for the new password twice, disabled while loading', () => {
    const onConfirmationChange = vi.fn();
    render(<PasswordChangeFields password="" confirmation="" disabled onPasswordChange={vi.fn()} onConfirmationChange={onConfirmationChange} />);
    expect(screen.getByText(/finaliser votre première connexion/)).toBeTruthy();
    for (const label of ['Nouveau mot de passe', 'Confirmer le mot de passe']) {
      expect(screen.getByLabelText(label).getAttribute('autocomplete')).toBe('new-password');
      expect(screen.getByLabelText(label).disabled).toBe(true);
    }
  });

  it('LoginFeedback shows the resume status, a dismissible error and the success', async () => {
    const onDismissError = vi.fn();
    const { rerender, container } = render(<LoginFeedback resuming={false} error="" success="" onDismissError={onDismissError} />);
    expect(container.innerHTML).toBe('');
    rerender(<LoginFeedback resuming error="Identifiants refusés" success="" onDismissError={onDismissError} />);
    expect(screen.getByRole('status').textContent).toContain('Reprise de votre session');
    expect(screen.getByRole('alert').textContent).toContain('Identifiants refusés');
    await userEvent.click(screen.getByRole('button', { name: 'Fermer le message' }));
    expect(onDismissError).toHaveBeenCalledTimes(1);
    rerender(<LoginFeedback resuming={false} error="" success="Mot de passe modifié" onDismissError={onDismissError} />);
    expect(screen.getByRole('status').textContent).toBe('Mot de passe modifié');
  });

  it('LoginSubmit labels each step and is disabled while loading', () => {
    const { rerender } = render(<LoginSubmit loading={false} passwordChange={false} />);
    expect(screen.getByRole('button', { name: 'Se connecter' }).getAttribute('type')).toBe('submit');
    rerender(<LoginSubmit loading passwordChange={false} />);
    expect(screen.getByRole('button').disabled).toBe(true);
    expect([loginSubmitLabel(false, true), loginSubmitLabel(true, true), loginSubmitLabel(true, false)])
      .toEqual(['Modifier le mot de passe', 'Modification…', 'Connexion…']);
  });

  it('SingleAccountLink leads to the single account and is inert while loading', () => {
    const { rerender } = render(<SingleAccountLink href="https://sso.example/auth" disabled={false} />);
    const link = screen.getByRole('link', { name: 'Se connecter avec le compte unique' });
    expect(link.getAttribute('href')).toBe('https://sso.example/auth');
    expect(link.getAttribute('aria-disabled')).toBeNull();
    rerender(<SingleAccountLink href="https://sso.example/auth" disabled />);
    const disabledLink = screen.getByRole('link', { name: 'Se connecter avec le compte unique' });
    expect(disabledLink.getAttribute('aria-disabled')).toBe('true');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    disabledLink.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });
});
