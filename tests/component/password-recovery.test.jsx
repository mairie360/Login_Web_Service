import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { beforeEach, expect, it, vi } from 'vitest';
import ForgotPassword from '@/components/ForgotPassword';
import ResetPassword from '@/components/ResetPassword';

const token = '94a0c99b-e39c-4a8e-96e8-1c8caad20cab';
let fetchMock;
const reply = (body, status = 200) => ({ ok: status === 200, status, json: async () => body });
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); window.history.replaceState(null, '', '/'); });

it('submits a recovery request once and shows only neutral feedback', async () => {
  const user = userEvent.setup(); let resolve;
  fetchMock.mockReturnValue(new Promise(yes => { resolve = yes; }));
  render(<ForgotPassword />);
  await user.type(screen.getByLabelText('Email professionnel'), 'agent@example.test');
  const form = document.querySelector('form');
  act(() => { fireEvent.submit(form); fireEvent.submit(form); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Email professionnel').disabled).toBe(true);
  expect(form.getAttribute('method')).toBe('post');
  expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/forgot-password');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'agent@example.test' });
  await act(async () => resolve(reply({ success: true, message: 'sensitive registration detail' })));
  expect(screen.getByRole('status').textContent).toBe('Si un compte existe, un e-mail a été envoyé.');
  expect(document.body.textContent).not.toContain('sensitive registration detail');
  expect(screen.getByRole('link', { name: 'Retour à la connexion' }).getAttribute('href')).toBe('/');
});
it('keeps the recovery form usable after refusal or network failure', async () => {
  fetchMock.mockResolvedValueOnce(reply({}, 429)).mockRejectedValueOnce(new Error('sensitive network detail'));
  render(<ForgotPassword />); const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email professionnel'), 'agent@example.test');
  await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Trop de demandes');
  expect(screen.getByLabelText('Email professionnel').disabled).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Impossible de joindre');
});
it('refuses empty recovery email before a request', () => {
  render(<ForgotPassword />); fireEvent.submit(document.querySelector('form'));
  expect(fetchMock).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toBeTruthy();
});
it.each([undefined, 'invalid-token'])('offers a new link when the reset token is absent or invalid: %s', token => {
  render(<ResetPassword token={token} />);
  expect(screen.getByRole('alert').textContent).toContain('expiré ou déjà utilisé');
  expect(screen.getByRole('link', { name: 'Demander un nouveau lien' }).getAttribute('href')).toBe('/forgot-password');
  expect(screen.queryByLabelText('Nouveau mot de passe')).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
it('requires matching passwords and submits the token only in the JSON body once', async () => {
  window.history.replaceState(null, '', '/reset-password?token=' + token);
  let resolve; fetchMock.mockReturnValue(new Promise(yes => { resolve = yes; }));
  const navigate = vi.fn(); const user = userEvent.setup();
  render(<ResetPassword token={token} redirectUrl="https://dashboard.example.test/" navigate={navigate} />);
  expect(window.location.search).toBe('');
  expect(document.body.innerHTML).not.toContain(token);
  await user.type(screen.getByLabelText('Nouveau mot de passe'), 'updated-password');
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'different-password');
  await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }));
  expect(screen.getByRole('alert').textContent).toContain('ne correspondent pas'); expect(fetchMock).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Confirmer le mot de passe'));
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'updated-password');
  act(() => { fireEvent.submit(document.querySelector('form')); fireEvent.submit(document.querySelector('form')); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/reset-password');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token, newPassword: 'updated-password' });
  expect(fetchMock.mock.calls[0][1].referrerPolicy).toBe('no-referrer');
  expect(screen.getByLabelText('Confirmer le mot de passe').disabled).toBe(true);
  expect(navigate).not.toHaveBeenCalled();
  await act(async () => resolve(reply({ success: true })));
  await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith('https://dashboard.example.test/'));
  expect(screen.getByLabelText('Nouveau mot de passe').value).toBe('');
});
it('reports expired/reused tokens and offers another link without navigation', async () => {
  fetchMock.mockResolvedValue(reply({ message: 'secret backend detail' }, 401));
  const navigate = vi.fn(); const user = userEvent.setup(); render(<ResetPassword token={token} navigate={navigate} />);
  await user.type(screen.getByLabelText('Nouveau mot de passe'), 'updated-password');
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'updated-password');
  await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }));
  expect((await screen.findByRole('alert')).textContent).toContain('expiré ou déjà utilisé');
  expect(screen.getByRole('link', { name: 'Demander un nouveau lien' })).toBeTruthy();
  expect(navigate).not.toHaveBeenCalled(); expect(document.body.textContent).not.toContain('secret backend detail');
});
it('does not navigate on malformed success and allows retry after a network failure', async () => {
  fetchMock.mockResolvedValueOnce(reply({})).mockRejectedValueOnce(new Error('transport failure'));
  const navigate = vi.fn(); const user = userEvent.setup(); render(<ResetPassword token={token} navigate={navigate} />);
  await user.type(screen.getByLabelText('Nouveau mot de passe'), 'updated-password');
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'updated-password');
  await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }));
  expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être modifié');
  await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Impossible de joindre');
  expect(screen.getByLabelText('Nouveau mot de passe').disabled).toBe(false); expect(navigate).not.toHaveBeenCalled();
});
it('has labeled recovery controls, keyboard focus and no serious accessibility violations', async () => {
  const user = userEvent.setup(); const { unmount } = render(<ForgotPassword />);
  await user.tab(); expect(document.activeElement).toBe(screen.getByLabelText('Email professionnel'));
  expect((await axe(document.body)).violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([]);
  unmount(); render(<ResetPassword token={token} />);
  expect((await axe(document.body)).violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([]);
});
