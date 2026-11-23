import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecureAccountStep } from './index';

const reply = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
const CODES = ['YOQM-3Y5S', '2ZXN-64EK', '7KNA-K6CC', 'FDGB-RIMD', 'WQZH-JFBF', 'HTET-ID44', 'K4CD-EDXC', '52CF-QF3J', '73KG-ZKVB', 'YHUI-67QX'];
const START = { secret: 'EXAMPLEKEYEXAMPL', otpauthUri: 'otpauth://totp/Mairie360:a@b.test?secret=EXAMPLEKEYEXAMPL' };
const route = (table) => vi.fn((url) => table[url]());
const setup = (fetchMock, policy) => {
  vi.stubGlobal('fetch', fetchMock);
  const handlers = { onSuccess: vi.fn(), onSessionOver: vi.fn(), onBack: vi.fn() };
  render(<SecureAccountStep policy={policy} {...handlers} />);
  return handlers;
};
const type = (value) => fireEvent.change(screen.getByLabelText(/Code affiché par l’application/), { target: { value } });
const submit = () => fireEvent.submit(document.querySelector('form'));
const ALL = { totp: true, passkey: false, backupCodes: true };

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); delete navigator.credentials; });

describe('SecureAccountStep (F7)', () => {
  it('application only: starts the enrolment once and shows the QR code, the key and the code field', async () => {
    const fetchMock = route({ '/api/auth/2fa/setup': () => reply(200, START) });
    setup(fetchMock, ALL);
    expect(await screen.findByText('Ajoutez Mairie 360 à votre application')).toBeTruthy();
    expect(screen.getByText('ÉTAPE 1 SUR 2')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('EXAM PLEK EYEX AMPL')).toBeTruthy());
    expect(screen.getByLabelText(/Code affiché par l’application/).getAttribute('autocomplete')).toBe('one-time-code');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/2fa/setup', { method: 'POST' });
  });

  it('both methods allowed: shows the choice first, and the application leads to the enrolment', async () => {
    const fetchMock = route({ '/api/auth/2fa/setup': () => reply(200, START) });
    vi.stubGlobal('PublicKeyCredential', function PublicKeyCredential() {});
    Object.defineProperty(navigator, 'credentials', { configurable: true, value: {} });
    setup(fetchMock, { totp: true, passkey: true, backupCodes: true });
    expect(screen.getByRole('heading', { name: 'Sécurisez votre compte' })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(await screen.findByText('Ajoutez Mairie 360 à votre application')).toBeTruthy();
  });

  it('passkey only, browser without WebAuthn: tells the agent instead of offering a method it cannot run', () => {
    const fetchMock = vi.fn();
    const { onBack } = setup(fetchMock, { totp: false, passkey: true, backupCodes: true });
    expect(screen.getByText('Votre navigateur ne permet pas de créer une passkey.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('both methods allowed but no WebAuthn: the choice is skipped and the application leads', async () => {
    const fetchMock = route({ '/api/auth/2fa/setup': () => reply(200, START) });
    setup(fetchMock, { totp: true, passkey: true, backupCodes: true });
    expect(await screen.findByText('Ajoutez Mairie 360 à votre application')).toBeTruthy();
  });

  it('an incomplete code is refused under the field with no request', async () => {
    const fetchMock = route({ '/api/auth/2fa/setup': () => reply(200, START) });
    setup(fetchMock, ALL);
    await screen.findByLabelText(/Code affiché par l’application/);
    type('12');
    submit();
    expect(screen.getByText('Saisissez le code à 6 chiffres.')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a wrong code shows « Code incorrect. » and keeps the enrolment usable', async () => {
    const fetchMock = route({ '/api/auth/2fa/setup': () => reply(200, START), '/api/auth/2fa/confirm': () => reply(401, { message: 'Code incorrect.', reason: 'wrong-code' }) });
    const { onSessionOver } = setup(fetchMock, ALL);
    await screen.findByLabelText(/Code affiché par l’application/);
    type('000000');
    submit();
    expect((await screen.findByRole('alert')).textContent).toContain('Code incorrect.');
    expect(screen.getByLabelText(/Code affiché par l’application/).disabled).toBe(false);
    expect(onSessionOver).not.toHaveBeenCalled();
  });

  it('journey: confirm → ten backup codes → tick the box → « Compte sécurisé » → the module opens', async () => {
    const fetchMock = route({ '/api/auth/2fa/setup': () => reply(200, START), '/api/auth/2fa/confirm': () => reply(200, { success: true, backupCodes: CODES }) });
    const { onSuccess } = setup(fetchMock, ALL);
    await screen.findByLabelText(/Code affiché par l’application/);
    type('492 039');
    submit();
    expect(await screen.findByText('Enregistrez vos codes de secours')).toBeTruthy();
    expect(screen.getByText('ÉTAPE 2 SUR 2')).toBeTruthy();
    expect(screen.getByText('YOQM-3Y5S')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/2fa/confirm', expect.objectContaining({ body: JSON.stringify({ code: '492039' }) }));

    submit();
    expect(screen.getByText('Confirmez que vous avez enregistré vos codes.')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('J’ai enregistré mes codes de secours en lieu sûr.'));
    submit();
    expect(await screen.findByText('Votre compte est sécurisé.')).toBeTruthy();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });

  it('backup codes not allowed: skips the codes screen and shows no step counter', async () => {
    const fetchMock = route({ '/api/auth/2fa/setup': () => reply(200, START), '/api/auth/2fa/confirm': () => reply(200, { success: true, backupCodes: CODES }) });
    setup(fetchMock, { totp: true, passkey: false, backupCodes: false });
    await screen.findByLabelText(/Code affiché par l’application/);
    expect(screen.queryByText('ÉTAPE 1 SUR 2')).toBeNull();
    type('492039');
    submit();
    expect(await screen.findByText('Votre compte est sécurisé.')).toBeTruthy();
  });

  it('an enrolment session that is over sends the agent back to the password', async () => {
    const start = route({ '/api/auth/2fa/setup': () => reply(401, { message: 'Votre session de connexion a expiré.', restartLogin: true }) });
    const { onSessionOver } = setup(start, ALL);
    await waitFor(() => expect(onSessionOver).toHaveBeenCalledTimes(1));
  });

  it('too many attempts locks the field until the Retry-After delay ends', async () => {
    const fetchMock = route({ '/api/auth/2fa/setup': () => reply(200, START), '/api/auth/2fa/confirm': () => reply(429, { message: 'Trop de tentatives.', retryAfter: 1 }) });
    setup(fetchMock, ALL);
    await screen.findByLabelText(/Code affiché par l’application/);
    type('000000');
    submit();
    expect((await screen.findByRole('alert')).textContent).toContain('Trop de tentatives.');
    expect(screen.getByLabelText(/Code affiché par l’application/).disabled).toBe(true);
    await waitFor(() => expect(screen.getByLabelText(/Code affiché par l’application/).disabled).toBe(false), { timeout: 3000 });
  });

  it('a failed start shows the error and lets the agent leave', async () => {
    const { onBack } = setup(route({ '/api/auth/2fa/setup': () => reply(503, { message: 'Le service de connexion est indisponible. Veuillez réessayer.' }) }), ALL);
    expect((await screen.findByRole('alert')).textContent).toContain('indisponible');
    fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  describe('passkey creation (MAIR-809)', () => {
    const OPTIONS = { options: { publicKey: { challenge: 'AQID', rp: { name: 'Mairie 360' }, user: { id: 'BAUG', name: 'a@b.test', displayName: 'A' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }] } } };
    const attestation = () => ({
      id: 'cred', rawId: new Uint8Array([1]).buffer, type: 'public-key',
      getClientExtensionResults: () => ({}),
      response: { attestationObject: new Uint8Array([2]).buffer, clientDataJSON: new Uint8Array([3]).buffer, getTransports: () => ['internal'] },
    });
    const BOTH = { totp: true, passkey: true, backupCodes: true };
    const withWebAuthn = (create) => {
      vi.stubGlobal('PublicKeyCredential', function PublicKeyCredential() {});
      Object.defineProperty(navigator, 'credentials', { configurable: true, value: { create } });
    };
    const name = (value) => fireEvent.change(screen.getByLabelText(/Nom de la passkey/), { target: { value } });
    const goToPasskey = () => {
      fireEvent.click(screen.getByLabelText(/Passkey/));
      fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    };
    afterEach(() => { delete navigator.credentials; });

    it('the choice offers the passkey, which leads to the name screen with a way back to the choice', () => {
      withWebAuthn(vi.fn());
      setup(vi.fn(), BOTH);
      goToPasskey();
      expect(screen.getByRole('heading', { name: 'Créer une passkey' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Choisir une autre méthode' }));
      expect(screen.getByRole('heading', { name: 'Sécurisez votre compte' })).toBeTruthy();
    });

    it('an empty name is refused under the field with no request', () => {
      const fetchMock = vi.fn();
      withWebAuthn(vi.fn());
      setup(fetchMock, BOTH);
      goToPasskey();
      submit();
      expect(screen.getByText('Donnez un nom à votre passkey.')).toBeTruthy();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('creates the passkey: options, browser ceremony, then the answer with the name, and the account is secured', async () => {
      const create = vi.fn(() => Promise.resolve(attestation()));
      withWebAuthn(create);
      const fetchMock = route({ '/api/auth/passkey/setup/options': () => reply(200, OPTIONS), '/api/auth/passkey/setup': () => reply(200, { success: true }) });
      setup(fetchMock, { totp: false, passkey: true, backupCodes: true });
      name('  Ordinateur du bureau ');
      submit();
      expect(await screen.findByText('Votre compte est sécurisé.')).toBeTruthy();
      const sent = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(sent.label).toBe('Ordinateur du bureau');
      expect(sent.credential.response).toEqual({ attestationObject: 'Ag', clientDataJSON: 'Aw', transports: ['internal'] });
      const publicKey = create.mock.calls[0][0].publicKey;
      expect(new Uint8Array(publicKey.challenge)).toEqual(new Uint8Array([1, 2, 3]));
      expect(new Uint8Array(publicKey.user.id)).toEqual(new Uint8Array([4, 5, 6]));
    });

    it('cancelling the browser window leaves the name screen with no error and nothing sent to the BFF', async () => {
      const create = vi.fn(() => Promise.reject(new DOMException('cancelled', 'NotAllowedError')));
      withWebAuthn(create);
      const fetchMock = route({ '/api/auth/passkey/setup/options': () => reply(200, OPTIONS) });
      setup(fetchMock, { totp: false, passkey: true, backupCodes: true });
      name('Téléphone');
      submit();
      await waitFor(() => expect(create).toHaveBeenCalled());
      await waitFor(() => expect(screen.getByRole('button', { name: 'Créer la passkey' })).toBeTruthy());
      expect(screen.queryByRole('alert')).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect((screen.getByLabelText(/Nom de la passkey/)).value).toBe('Téléphone');
    });

    it('an expired enrolment token (401 with restartLogin) sends the agent back to the password', async () => {
      withWebAuthn(vi.fn());
      const fetchMock = route({ '/api/auth/passkey/setup/options': () => reply(401, { message: 'x', restartLogin: true }) });
      const { onSessionOver } = setup(fetchMock, { totp: false, passkey: true, backupCodes: true });
      name('Téléphone');
      submit();
      await waitFor(() => expect(onSessionOver).toHaveBeenCalledTimes(1));
    });

    it('a refused answer (400) and a rate limit (429) show their French message and keep the name', async () => {
      withWebAuthn(vi.fn(() => Promise.resolve(attestation())));
      let status = 400;
      const fetchMock = route({
        '/api/auth/passkey/setup/options': () => reply(200, OPTIONS),
        '/api/auth/passkey/setup': () => (status === 400 ? reply(400, { message: 'La passkey n’a pas pu être vérifiée.', reason: 'refused' }) : reply(429, { message: 'Trop de tentatives.', retryAfter: 12 })),
      });
      setup(fetchMock, { totp: false, passkey: true, backupCodes: true });
      name('Téléphone');
      submit();
      expect(await screen.findByText('La passkey n’a pas pu être vérifiée.')).toBeTruthy();
      status = 429;
      submit();
      expect(await screen.findByText('Réessayez dans 12 secondes.')).toBeTruthy();
      expect((screen.getByLabelText(/Nom de la passkey/)).value).toBe('Téléphone');
    });
  });
});
