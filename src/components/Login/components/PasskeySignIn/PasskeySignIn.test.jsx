import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasskeySignIn } from './PasskeySignIn';
import { base64UrlToBuffer, bufferToBase64Url, credentialToJson, isCancellation, requestOptionsFromJson } from './webauthn';

const OPTIONS = { id: 'ceremony-1', options: { publicKey: { challenge: 'q1w2e3r4', rpId: 'mairie360-eip.fr', userVerification: 'required' } } };

const reply = (status, body = {}, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const bytes = (...values) => new Uint8Array(values).buffer;
const assertion = () => ({
  id: 'k3m9x7p2', rawId: bytes(1, 2, 3), type: 'public-key', authenticatorAttachment: 'platform', getClientExtensionResults: () => ({}),
  response: { authenticatorData: bytes(4, 5), clientDataJSON: bytes(6, 7), signature: bytes(8, 9), userHandle: bytes(10) },
});

let get;
let fetchMock;
let routes;

function stubBrowser({ conditional = false } = {}) {
  function PublicKeyCredential() {}
  PublicKeyCredential.isConditionalMediationAvailable = async () => conditional;
  vi.stubGlobal('PublicKeyCredential', PublicKeyCredential);
  window.PublicKeyCredential = PublicKeyCredential;
  get = vi.fn(async () => assertion());
  Object.defineProperty(navigator, 'credentials', { configurable: true, value: { get } });
}

beforeEach(() => {
  routes = { '/api/auth/passkey/options': () => reply(200, OPTIONS), '/api/auth/passkey': () => reply(200, { success: true }) };
  fetchMock = vi.fn(async (url, init) => routes[url](init));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete window.PublicKeyCredential;
  Reflect.deleteProperty(navigator, 'credentials');
});

describe('MAIR-811 F5 passkey sign-in', () => {
  it('shows nothing, and asks nothing, when the browser has no WebAuthn', async () => {
    render(<PasskeySignIn onSuccess={vi.fn()} />);
    await act(async () => {});
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('separator')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers the « ou » separator and the passkey button once the challenge is available', async () => {
    stubBrowser();
    render(<PasskeySignIn onSuccess={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Se connecter avec une passkey' })).toBeTruthy();
    expect(screen.getByRole('separator', { name: 'ou' })).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
  });

  it('503: the button disappears and the information tells to use the password', async () => {
    stubBrowser();
    routes['/api/auth/passkey/options'] = () => reply(503, { reason: 'unavailable' });
    render(<PasskeySignIn onSuccess={vi.fn()} />);
    expect(await screen.findByText('Connexion par passkey indisponible pour le moment. Utilisez votre mot de passe.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('403: the mairie does not accept passkeys, so nothing is offered and no error is shown', async () => {
    stubBrowser();
    routes['/api/auth/passkey/options'] = () => reply(403, { reason: 'not-accepted' });
    render(<PasskeySignIn onSuccess={vi.fn()} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a click asks the browser with the decoded challenge, sends the signed answer and signs in', async () => {
    stubBrowser();
    const onSuccess = vi.fn();
    render(<PasskeySignIn onSuccess={onSuccess} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec une passkey' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

    const { publicKey, mediation } = get.mock.calls[0][0];
    expect(mediation).toBeUndefined();
    expect(publicKey.userVerification).toBe('required');
    expect(bufferToBase64Url(publicKey.challenge)).toBe('q1w2e3r4');

    const sent = JSON.parse(fetchMock.mock.calls.find(([url]) => url === '/api/auth/passkey')[1].body);
    expect(sent).toEqual({
      id: 'ceremony-1',
      credential: {
        id: 'k3m9x7p2', rawId: 'AQID', type: 'public-key', authenticatorAttachment: 'platform', clientExtensionResults: {},
        response: { authenticatorData: 'BAU', clientDataJSON: 'Bgc', signature: 'CAk', userHandle: 'Cg' },
      },
    });
  });

  it('closing the browser window shows no error and sends nothing', async () => {
    stubBrowser();
    get.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'));
    const onSuccess = vi.fn();
    render(<PasskeySignIn onSuccess={onSuccess} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec une passkey' }));
    await waitFor(() => expect(get).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByRole('alert')).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/passkey')).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Se connecter avec une passkey' })).toBeTruthy();
  });

  it.each([
    [401, { message: 'Cette passkey n’est pas reconnue.', reason: 'unknown-passkey' }, 'Cette passkey n’est pas reconnue.'],
    [403, { message: 'Ce compte est désactivé.', reason: 'disabled' }, 'Ce compte est désactivé.'],
    [429, { message: 'Trop de tentatives.', retryAfter: 30 }, 'Trop de tentatives.'],
  ])('%i: the refusal is shown in an alert, the agent can retry and is not signed in', async (status, body, message) => {
    stubBrowser();
    routes['/api/auth/passkey'] = () => reply(status, body);
    const onSuccess = vi.fn();
    render(<PasskeySignIn onSuccess={onSuccess} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec une passkey' }));
    expect((await screen.findByRole('alert')).textContent).toContain(message);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Se connecter avec une passkey' })).toBeTruthy();
  });

  it('503 after the answer hides the button and tells to use the password', async () => {
    stubBrowser();
    routes['/api/auth/passkey'] = () => reply(503, { reason: 'unavailable' });
    render(<PasskeySignIn onSuccess={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec une passkey' }));
    expect(await screen.findByText('Connexion par passkey indisponible pour le moment. Utilisez votre mot de passe.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('a challenge that cannot be fetched shows an error and keeps the button', async () => {
    stubBrowser();
    let calls = 0;
    routes['/api/auth/passkey/options'] = () => (++calls === 1 ? reply(200, OPTIONS) : reply(502, { message: 'Le service de connexion est indisponible.' }));
    render(<PasskeySignIn onSuccess={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec une passkey' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Le service de connexion est indisponible.');
    expect(get).not.toHaveBeenCalled();
  });

  it('a network failure on the challenge says the service cannot be reached', async () => {
    stubBrowser();
    let calls = 0;
    routes['/api/auth/passkey/options'] = () => { if (++calls === 1) return reply(200, OPTIONS); throw new TypeError('offline'); };
    render(<PasskeySignIn onSuccess={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec une passkey' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Impossible de joindre le service de connexion.');
  });

  it('an unexpected browser error shows the generic message', async () => {
    stubBrowser();
    get.mockRejectedValue(new DOMException('boom', 'SecurityError'));
    render(<PasskeySignIn onSuccess={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec une passkey' }));
    expect((await screen.findByRole('alert')).textContent).toContain('La connexion par passkey a échoué. Veuillez réessayer.');
  });

  it('the error alert can be dismissed', async () => {
    stubBrowser();
    routes['/api/auth/passkey'] = () => reply(401, { message: 'Cette passkey n’est pas reconnue.' });
    render(<PasskeySignIn onSuccess={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec une passkey' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /fermer|dismiss/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  describe('autofill of the e-mail field (conditional mediation)', () => {
    it('starts at once with mediation « conditional » and signs in when the agent picks a passkey', async () => {
      stubBrowser({ conditional: true });
      const onSuccess = vi.fn();
      render(<PasskeySignIn onSuccess={onSuccess} />);
      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
      const request = get.mock.calls[0][0];
      expect(request.mediation).toBe('conditional');
      expect(request.signal).toBeInstanceOf(AbortSignal);
    });

    it('clicking the button replaces the autofill ceremony: it is aborted, then the modal one starts', async () => {
      stubBrowser({ conditional: true });
      let abortSignal;
      get.mockImplementationOnce((request) => new Promise((_, reject) => {
        abortSignal = request.signal;
        request.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }));
      const onSuccess = vi.fn();
      render(<PasskeySignIn onSuccess={onSuccess} />);
      const button = await screen.findByRole('button', { name: 'Se connecter avec une passkey' });
      await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
      fireEvent.click(button);
      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
      expect(abortSignal.aborted).toBe(true);
      expect(get).toHaveBeenCalledTimes(2);
      expect(get.mock.calls[1][0].mediation).toBeUndefined();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('leaving the page aborts the autofill ceremony', async () => {
      stubBrowser({ conditional: true });
      let abortSignal;
      get.mockImplementationOnce((request) => new Promise((_, reject) => {
        abortSignal = request.signal;
        request.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }));
      const { unmount } = render(<PasskeySignIn onSuccess={vi.fn()} />);
      await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
      unmount();
      expect(abortSignal.aborted).toBe(true);
    });

    it('a browser without autofill still offers the button and starts nothing on its own', async () => {
      stubBrowser({ conditional: false });
      render(<PasskeySignIn onSuccess={vi.fn()} />);
      await screen.findByRole('button', { name: 'Se connecter avec une passkey' });
      expect(get).not.toHaveBeenCalled();
    });

    it('an unexpected error of the autofill ceremony is shown, a cancellation is not', async () => {
      stubBrowser({ conditional: true });
      get.mockRejectedValueOnce(new DOMException('boom', 'SecurityError'));
      render(<PasskeySignIn onSuccess={vi.fn()} />);
      expect((await screen.findByRole('alert')).textContent).toContain('La connexion par passkey a échoué.');
    });
  });
});

describe('MAIR-811 WebAuthn JSON helpers', () => {
  it('converts base64url to a buffer and back, with and without padding', () => {
    expect([...new Uint8Array(base64UrlToBuffer('AQID'))]).toEqual([1, 2, 3]);
    expect([...new Uint8Array(base64UrlToBuffer('-_8'))]).toEqual([251, 255]);
    expect(bufferToBase64Url(bytes(251, 255))).toBe('-_8');
    expect(bufferToBase64Url(bytes(1, 2, 3))).toBe('AQID');
  });

  it('reads the options whole (`{ publicKey }`) or bare, and decodes the allowed credentials', () => {
    const whole = requestOptionsFromJson({ publicKey: { challenge: 'AQID', allowCredentials: [{ type: 'public-key', id: 'BAU' }] }, mediation: 'conditional' });
    const bare = requestOptionsFromJson({ challenge: 'AQID' });
    expect([...new Uint8Array(whole.challenge)]).toEqual([1, 2, 3]);
    expect([...new Uint8Array(whole.allowCredentials[0].id)]).toEqual([4, 5]);
    expect(whole.allowCredentials[0].type).toBe('public-key');
    expect([...new Uint8Array(bare.challenge)]).toEqual([1, 2, 3]);
    expect(bare.allowCredentials).toBeUndefined();
  });

  it('leaves out the optional fields a passkey did not provide', () => {
    const json = credentialToJson({ ...assertion(), authenticatorAttachment: null, response: { ...assertion().response, userHandle: null } });
    expect(json).not.toHaveProperty('authenticatorAttachment');
    expect(json.response).not.toHaveProperty('userHandle');
  });

  it('tells a cancellation from a real error', () => {
    expect(isCancellation(new DOMException('x', 'NotAllowedError'))).toBe(true);
    expect(isCancellation(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isCancellation(new DOMException('x', 'SecurityError'))).toBe(false);
    expect(isCancellation(new Error('x'))).toBe(false);
  });
});
