import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TwoFactorStep } from './index';

const reply = (status, body, headers = {}) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } }));
const setup = (fetchMock) => {
  vi.stubGlobal('fetch', fetchMock);
  const handlers = { onSuccess: vi.fn(), onSessionOver: vi.fn(), onBack: vi.fn() };
  render(<TwoFactorStep {...handlers} />);
  return handlers;
};
const type = (label, value) => fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value } });
const submit = () => fireEvent.submit(document.querySelector('form'));

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('TwoFactorStep (F6)', () => {
  it('shows the verification card of the mockup', () => {
    setup(vi.fn());
    expect(screen.getByRole('heading', { name: 'Code de vérification' })).toBeTruthy();
    expect(screen.getByText('Ouvrez votre application d’authentification et saisissez le code à 6 chiffres affiché pour Mairie 360.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Vérifier' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Utiliser un code de secours' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retour à la connexion' })).toBeTruthy();
    expect(screen.getByLabelText(/Code de vérification/).getAttribute('autocomplete')).toBe('one-time-code');
  });

  it('MAIR-806 case 1: an empty or incomplete code is refused under the field, with no request', () => {
    const fetchMock = vi.fn();
    setup(fetchMock);
    submit();
    expect(screen.getByText('Saisissez le code à 6 chiffres.')).toBeTruthy();
    type('Code de vérification', '12 34');
    submit();
    expect(screen.getByText('Saisissez le code à 6 chiffres.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the cleaned code to the same-origin route and finishes the sign-in', async () => {
    const fetchMock = vi.fn(() => reply(200, { success: true }));
    const { onSuccess } = setup(fetchMock);
    type('Code de vérification', '123 456');
    submit();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login/2fa', expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: '123456' }) }));
  });

  it('MAIR-806 case 2: a wrong code shows « Code incorrect. » and keeps the field usable', async () => {
    const { onSessionOver } = setup(vi.fn(() => reply(401, { message: 'Code incorrect.', reason: 'wrong-code' })));
    type('Code de vérification', '000000');
    submit();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Code incorrect.');
    expect(alert.textContent).toContain('Vérifiez que l’heure de votre téléphone est juste, puis saisissez le nouveau code.');
    expect(screen.getByLabelText(/Code de vérification/).disabled).toBe(false);
    expect(onSessionOver).not.toHaveBeenCalled();
  });

  it('MAIR-806 case 3: too many attempts disables the field and the button until the Retry-After delay ends', async () => {
    setup(vi.fn(() => reply(429, { message: 'Trop de tentatives.', retryAfter: 1 })));
    type('Code de vérification', '000000');
    submit();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Trop de tentatives.');
    expect(alert.textContent).toContain('Réessayez dans 1 seconde. Le champ se réactive à la fin du délai.');
    expect(screen.getByLabelText(/Code de vérification/).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Vérifier' }).disabled).toBe(true);
    await waitFor(() => expect(screen.getByLabelText(/Code de vérification/).disabled).toBe(false), { timeout: 3000 });
    expect(screen.getByRole('button', { name: 'Vérifier' }).disabled).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('MAIR-806 case 4: a login session that is over goes back to the password', async () => {
    const { onSessionOver } = setup(vi.fn(() => reply(401, { message: 'Votre session de connexion a expiré.', restartLogin: true })));
    type('Code de vérification', '123456');
    submit();
    await waitFor(() => expect(onSessionOver).toHaveBeenCalledTimes(1));
  });

  it('switches to the backup code and back, clearing the code and the alert', async () => {
    setup(vi.fn(() => reply(401, { reason: 'wrong-code' })));
    type('Code de vérification', '000000');
    submit();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser un code de secours' }));
    expect(screen.getByRole('heading', { name: 'Code de secours' })).toBeTruthy();
    expect(screen.getByText('Saisissez l’un des codes de secours que vous avez enregistrés. Chaque code ne sert qu’une fois.')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByPlaceholderText('XXXX-XXXX')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser le code de l’application' }));
    expect(screen.getByRole('heading', { name: 'Code de vérification' })).toBeTruthy();
  });

  it('MAIR-806 case 5: a spent backup code asks for another one', async () => {
    const fetchMock = vi.fn(() => reply(401, { message: 'Ce code de secours a déjà été utilisé.', reason: 'spent-backup-code' }));
    setup(fetchMock);
    fireEvent.click(screen.getByRole('button', { name: 'Utiliser un code de secours' }));
    type('Code de secours', 'k3m9x7pq');
    submit();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Ce code de secours a déjà été utilisé.');
    expect(alert.textContent).toContain('Utilisez un autre code de secours.');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login/2fa', expect.objectContaining({ body: JSON.stringify({ code: 'K3M9-X7PQ' }) }));
  });

  it('« Retour à la connexion » leaves the step without any request', () => {
    const fetchMock = vi.fn();
    const { onBack } = setup(fetchMock);
    fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers a network failure with a message and keeps the step', async () => {
    const { onSuccess } = setup(vi.fn(() => Promise.reject(new Error('offline'))));
    type('Code de vérification', '123456');
    submit();
    expect((await screen.findByRole('alert')).textContent).toContain('Impossible de joindre le service de connexion.');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('TwoFactorStep failures (MAIR-806)', () => {
  it('shows the French message of a BFF failure and keeps the field usable', async () => {
    setup(vi.fn(() => reply(503, { message: 'Le service de connexion est indisponible. Veuillez réessayer.' })));
    type('Code de vérification', '123456');
    submit();
    expect((await screen.findByRole('alert')).textContent).toContain('Le service de connexion est indisponible.');
    expect(screen.getByLabelText(/Code de vérification/).disabled).toBe(false);
  });

  it('tells the agent when the service cannot be reached, and lets them retry', async () => {
    setup(vi.fn(() => Promise.reject(new Error('network down'))));
    type('Code de vérification', '123456');
    submit();
    expect((await screen.findByRole('alert')).textContent).toContain('Impossible de joindre le service de connexion.');
    expect(screen.getByRole('button', { name: 'Vérifier' }).disabled).toBe(false);
  });

  it('dismisses the alert', async () => {
    setup(vi.fn(() => reply(401, { message: 'Code incorrect.', reason: 'wrong-code' })));
    type('Code de vérification', '000000');
    submit();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /fermer|Close/i }));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
