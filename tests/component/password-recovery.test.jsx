import { StrictMode } from 'react';
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
  expect(screen.getByRole('status').textContent).toBe('Lien envoyé.Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.');
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
  expect(screen.getByRole('alert').textContent).toBe('Lien invalide ou expiré.Demandez un nouveau lien pour continuer.');
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
  await user.type(screen.getByLabelText('Nouveau mot de passe'), 'updated-password-1');
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'different-password-2');
  await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }));
  expect(screen.getByRole('alert').textContent).toContain('ne correspondent pas'); expect(fetchMock).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Confirmer le mot de passe'));
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'updated-password-1');
  act(() => { fireEvent.submit(document.querySelector('form')); fireEvent.submit(document.querySelector('form')); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('/api/auth/reset-password');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token, newPassword: 'updated-password-1' });
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
  await user.type(screen.getByLabelText('Nouveau mot de passe'), 'updated-password-1');
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'updated-password-1');
  await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Lien invalide ou expiré.Demandez un nouveau lien pour continuer.');
  expect(screen.getByRole('link', { name: 'Demander un nouveau lien' })).toBeTruthy();
  expect(navigate).not.toHaveBeenCalled(); expect(document.body.textContent).not.toContain('secret backend detail');
});
it('does not navigate on malformed success and allows retry after a network failure', async () => {
  fetchMock.mockResolvedValueOnce(reply({})).mockRejectedValueOnce(new Error('transport failure'));
  const navigate = vi.fn(); const user = userEvent.setup(); render(<ResetPassword token={token} navigate={navigate} />);
  await user.type(screen.getByLabelText('Nouveau mot de passe'), 'updated-password-1');
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'updated-password-1');
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

it('ignores a late accepted reset response after leaving the recovery screen', async () => {
  let resolve;
  fetchMock.mockReturnValue(new Promise(done => { resolve = done; }));
  const navigate = vi.fn();
  const view = render(<ResetPassword token={token} redirectUrl="https://dashboard.example.test/old-destination" navigate={navigate} />);
  fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'updated-password-1' } });
  fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'updated-password-1' } });
  fireEvent.submit(document.querySelector('form'));
  view.unmount();
  await act(async () => resolve(reply({ success: true })));
  expect(navigate).not.toHaveBeenCalled();
});

it('starts a fresh reset form when a new token replaces an expired link', async () => {
  fetchMock.mockResolvedValue(reply({}, 401));
  const view = render(<ResetPassword token={token} />);
  fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'updated-password-1' } });
  fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'updated-password-1' } });
  fireEvent.submit(document.querySelector('form'));
  await screen.findByRole('alert');
  view.rerender(<ResetPassword token="22222222-e39c-4a8e-96e8-1c8caad20cab" />);
  expect(screen.queryByLabelText('Nouveau mot de passe')).not.toBeNull();
  expect(screen.getByLabelText('Nouveau mot de passe').value).toBe('');
  expect(screen.getByRole('button', { name: 'Modifier le mot de passe' }).disabled).toBe(false);
});


it('keeps a new token usable in StrictMode and ignores acceptance of the superseded token', async () => {
  let resolveOld;
  fetchMock.mockReturnValueOnce(new Promise(done => { resolveOld = done; })).mockResolvedValueOnce(reply({ success: true }));
  const navigate = vi.fn();
  const view = render(<StrictMode><ResetPassword token={token} redirectUrl="https://dashboard.example.test/old" navigate={navigate} /></StrictMode>);
  const submitPassword = () => {
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'updated-password-1' } });
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'updated-password-1' } });
    fireEvent.submit(document.querySelector('form'));
  };
  submitPassword();
  view.rerender(<StrictMode><ResetPassword token="22222222-e39c-4a8e-96e8-1c8caad20cab" redirectUrl="https://dashboard.example.test/new" navigate={navigate} /></StrictMode>);
  expect(screen.getByLabelText('Nouveau mot de passe').value).toBe('');
  expect(screen.getByRole('button', { name: 'Modifier le mot de passe' }).disabled).toBe(false);
  await act(async () => resolveOld(reply({ success: true })));
  expect(navigate).not.toHaveBeenCalled();
  submitPassword();
  await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith('https://dashboard.example.test/new'));
});

it('keeps the destination in the return link and allows retry after a generic recovery refusal', async () => {
  fetchMock.mockResolvedValueOnce(reply({ message: 'sensitive service detail' }, 503)).mockResolvedValueOnce(reply({}));
  const destination = 'https://dashboard.example.test/projects?filter=active';
  render(<ForgotPassword redirectUrl={destination} />);
  expect(screen.getByRole('link', { name: 'Retour à la connexion' }).getAttribute('href')).toBe('/?redirect=' + encodeURIComponent(destination));
  fireEvent.change(screen.getByLabelText('Email professionnel'), { target: { value: 'agent@example.test' } });
  fireEvent.submit(document.querySelector('form'));
  expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être envoyée');
  expect(document.body.textContent).not.toContain('sensitive service detail');
  expect(screen.getByLabelText('Email professionnel').disabled).toBe(false);
  fireEvent.submit(document.querySelector('form'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être envoyée');
});

const RULE = 'Utilisez au moins 12 caractères.';
it.each([
  ['too short', 'abcdef12345', RULE],
  ['11-character', 'onze-signes', RULE],
  ['too long', 'x'.repeat(255) + '1', 'ne doit pas dépasser 255 caractères'],
])('MAIR-888 F4: a %s password is refused before sending a reset token', (_, password, message) => {
  render(<ResetPassword token={token} />);
  fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: password } });
  fireEvent.submit(document.querySelector('form'));
  expect(screen.getByRole('alert').textContent).toContain(message);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('MAIR-888 F4: the rule is shown as help text, then the confirmation is checked, and a 12-character password is accepted', async () => {
  fetchMock.mockResolvedValue(reply({ success: true }));
  render(<ResetPassword token={token} navigate={vi.fn()} />);
  expect(document.body.textContent).toContain('Choisissez un mot de passe d’au moins 12 caractères, qui ne soit ni un mot de passe courant, ni votre e-mail, votre prénom ou votre nom.');
  expect(document.body.textContent).toContain('12 caractères minimum. Évitez les mots de passe courants, votre e-mail, votre prénom et votre nom.');
  fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'abcdefghij12' } });
  fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'abcdefghij13' } });
  fireEvent.submit(document.querySelector('form'));
  expect(screen.getByRole('alert').textContent).toContain('ne correspondent pas');
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'abcdefghij12' } });
  fireEvent.submit(document.querySelector('form'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Mot de passe modifié.Vous pouvez vous connecter.'));
  expect(screen.getByLabelText('Nouveau mot de passe').disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Modifier le mot de passe' }).disabled).toBe(true);
});

it('MAIR-888 F4: an invalid link offers a new link as the main action and a way back to sign-in', () => {
  render(<ResetPassword redirectUrl="https://dashboard.example.test/" />);
  expect(screen.getByRole('alert').textContent).toBe('Lien invalide ou expiré.Demandez un nouveau lien pour continuer.');
  expect(screen.getByRole('link', { name: 'Demander un nouveau lien' }).getAttribute('href')).toBe('/forgot-password?redirect=https%3A%2F%2Fdashboard.example.test%2F');
  expect(screen.getByRole('link', { name: 'Retour à la connexion' }).getAttribute('href')).toBe('/?redirect=https%3A%2F%2Fdashboard.example.test%2F');
});

it('recovers from reset throttling and confirms an accepted reset without a destination', async () => {
  fetchMock.mockResolvedValueOnce(reply({ message: 'sensitive upstream detail' }, 429)).mockResolvedValueOnce(reply({ success: true }));
  const navigate = vi.fn();
  render(<ResetPassword token={token} navigate={navigate} />);
  fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'updated-password-1' } });
  fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'updated-password-1' } });
  fireEvent.submit(document.querySelector('form'));
  expect((await screen.findByRole('alert')).textContent).toContain('Trop de demandes');
  expect(document.body.textContent).not.toContain('sensitive upstream detail');
  expect(screen.getByRole('button', { name: 'Modifier le mot de passe' }).disabled).toBe(false);
  fireEvent.submit(document.querySelector('form'));
  expect((await screen.findByRole('status')).textContent).toBe('Mot de passe modifié.Vous pouvez vous connecter.');
  expect(navigate).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Nouveau mot de passe').value).toBe('');
  expect(screen.getByRole('button', { name: 'Modifier le mot de passe' }).disabled).toBe(true);
});

it('aborts the in-flight reset and ignores its rejected fetch after leaving the screen', async () => {
  let reject;
  fetchMock.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  const navigate = vi.fn();
  const view = render(<ResetPassword token={token} navigate={navigate} />);
  fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'updated-password-1' } });
  fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'updated-password-1' } });
  fireEvent.submit(document.querySelector('form'));
  const signal = fetchMock.mock.calls[0][1].signal;
  expect(signal.aborted).toBe(false);
  view.unmount();
  expect(signal.aborted).toBe(true);
  render(<main>Nouvel écran</main>);
  await act(async () => reject(new DOMException('Aborted', 'AbortError')));
  expect(screen.getByText('Nouvel écran')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(navigate).not.toHaveBeenCalled();
});
