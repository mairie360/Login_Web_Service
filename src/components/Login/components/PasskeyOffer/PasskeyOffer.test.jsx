import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PasskeyOffer } from './PasskeyOffer';
import { OFFER_DISMISSED_STORAGE_ENTRY, PROVISIONAL_LABEL, isPasskeyOfferDismissed, shouldOfferPasskey } from '.';

const CREATION = { options: { publicKey: { challenge: 'q1w2', rp: { id: 'mairie360-eip.fr', name: 'Mairie 360' }, user: { id: 'dXNlcg', name: 'agent', displayName: 'Agent' } } } };
const reply = (status, body = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const bytes = (...values) => new Uint8Array(values).buffer;
const attestation = () => ({
  id: 'k3m9', rawId: bytes(1, 2), type: 'public-key', authenticatorAttachment: 'platform', getClientExtensionResults: () => ({}),
  response: { attestationObject: bytes(3), clientDataJSON: bytes(4), getTransports: () => ['internal'] },
});

let create;
let routes;
let fetchMock;

function stubBrowser({ conditionalCreate = false } = {}) {
  function PublicKeyCredential() {}
  PublicKeyCredential.getClientCapabilities = async () => ({ conditionalCreate });
  vi.stubGlobal('PublicKeyCredential', PublicKeyCredential);
  window.PublicKeyCredential = PublicKeyCredential;
  create = vi.fn(async () => attestation());
  Object.defineProperty(navigator, 'credentials', { configurable: true, value: { create } });
}

beforeEach(() => {
  window.localStorage.clear();
  routes = {
    '/api/passkeys/options': () => reply(200, CREATION),
    '/api/passkeys': () => reply(201, { id: 7, label: PROVISIONAL_LABEL, provider: 'Gestionnaire de mots de passe Google' }),
    '/api/passkeys/name': () => reply(200, { label: 'x' }),
  };
  fetchMock = vi.fn(async (url, init) => routes[url](init));
  vi.stubGlobal('fetch', fetchMock);
  stubBrowser();
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete window.PublicKeyCredential;
  Reflect.deleteProperty(navigator, 'credentials');
});

const bodyOf = (url) => JSON.parse(fetchMock.mock.calls.find(([called]) => called === url)[1].body);

describe('MAIR-811 F8 passkey offer after a password sign-in', () => {
  it('is proposed only when allowed, not registered, supported by the browser and not declined on this device', () => {
    expect(shouldOfferPasskey({ allowed: true, registered: false })).toBe(true);
    expect(shouldOfferPasskey({ allowed: false, registered: false })).toBe(false);
    expect(shouldOfferPasskey({ allowed: true, registered: true })).toBe(false);
    expect(shouldOfferPasskey(undefined)).toBe(false);
    window.localStorage.setItem(OFFER_DISMISSED_STORAGE_ENTRY, '1');
    expect(shouldOfferPasskey({ allowed: true, registered: false })).toBe(false);
    window.localStorage.clear();
    delete window.PublicKeyCredential;
    vi.unstubAllGlobals();
    expect(shouldOfferPasskey({ allowed: true, registered: false })).toBe(false);
  });

  it('shows the offer of the mockup: three benefits, create, later, never on this device', async () => {
    render(<PasskeyOffer onDone={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Connectez-vous plus vite avec une passkey' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Inutilisable sur un faux site qui imiterait Mairie 360.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Créer une passkey' }).getAttribute('data-m360-component')).toContain('CreatePasskeyButton');
    expect(screen.getByRole('button', { name: 'Plus tard' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ne plus me le proposer sur cet appareil' })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('« Plus tard » opens the module and will propose again; « Ne plus me le proposer » is remembered on this device', async () => {
    const onDone = vi.fn();
    const { unmount } = render(<PasskeyOffer onDone={onDone} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Plus tard' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(isPasskeyOfferDismissed()).toBe(false);
    unmount();
    render(<PasskeyOffer onDone={onDone} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ne plus me le proposer sur cet appareil' }));
    expect(onDone).toHaveBeenCalledTimes(2);
    expect(isPasskeyOfferDismissed()).toBe(true);
  });

  it('creates the passkey, then proposes the manager as its name and saves the one kept', async () => {
    const onDone = vi.fn();
    render(<PasskeyOffer onDone={onDone} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Créer une passkey' }));
    expect(await screen.findByRole('heading', { name: 'Passkey enregistrée' })).toBeTruthy();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].mediation).toBeUndefined();
    expect(bodyOf('/api/passkeys').label).toBe(PROVISIONAL_LABEL);
    expect(bodyOf('/api/passkeys').credential.rawId).toBe('AQI');
    expect(screen.getByText('Elle est enregistrée dans Gestionnaire de mots de passe Google. Utilisez-la à votre prochaine connexion.')).toBeTruthy();
    const field = screen.getByLabelText(/Nom de la passkey/);
    expect(field.value).toBe('Gestionnaire de mots de passe Google');
    fireEvent.change(field, { target: { value: 'Ordinateur de la mairie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(bodyOf('/api/passkeys/name')).toEqual({ id: 7, label: 'Ordinateur de la mairie' });
  });

  it('an unknown manager leaves the name to type, and an empty name is refused before any call', async () => {
    routes['/api/passkeys'] = () => reply(201, { id: 7, label: PROVISIONAL_LABEL, provider: null });
    render(<PasskeyOffer onDone={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Créer une passkey' }));
    expect(await screen.findByText('Utilisez-la à votre prochaine connexion.')).toBeTruthy();
    expect(screen.getByLabelText(/Nom de la passkey/).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(await screen.findByText('Donnez un nom à cette passkey.')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/passkeys/name')).toBe(false);
  });

  it('closing the browser window is silent; a refused creation is told in French', async () => {
    create.mockRejectedValueOnce(new DOMException('closed', 'NotAllowedError'));
    render(<PasskeyOffer onDone={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Créer une passkey' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).toBeNull();
    routes['/api/passkeys'] = () => reply(400, { message: 'La passkey n’a pas pu être vérifiée.', reason: 'refused' });
    fireEvent.click(screen.getByRole('button', { name: 'Créer une passkey' }));
    expect(await screen.findByText('La passkey n’a pas pu être vérifiée.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Connectez-vous plus vite avec une passkey' })).toBeTruthy();
  });

  it('a name the BFF refuses keeps the screen with its message', async () => {
    routes['/api/passkeys/name'] = () => reply(502, { message: 'Le service de connexion est indisponible. Veuillez réessayer.' });
    const onDone = vi.fn();
    render(<PasskeyOffer onDone={onDone} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Créer une passkey' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Continuer' }));
    expect(await screen.findByText('Le service de connexion est indisponible. Veuillez réessayer.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('a browser that creates the passkey by itself opens the module without the offer, named after its manager', async () => {
    stubBrowser({ conditionalCreate: true });
    const onDone = vi.fn();
    render(<PasskeyOffer onDone={onDone} />);
    expect(screen.getByText('Ouverture de votre module…')).toBeTruthy();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(create.mock.calls[0][0].mediation).toBe('conditional');
    expect(bodyOf('/api/passkeys/name')).toEqual({ id: 7, label: 'Gestionnaire de mots de passe Google' });
    expect(screen.queryByRole('heading', { name: 'Connectez-vous plus vite avec une passkey' })).toBeNull();
  });

  it('when the automatic creation is declined, the offer is shown', async () => {
    stubBrowser({ conditionalCreate: true });
    create.mockRejectedValueOnce(new DOMException('declined', 'NotAllowedError'));
    const onDone = vi.fn();
    render(<PasskeyOffer onDone={onDone} />);
    expect(await screen.findByRole('heading', { name: 'Connectez-vous plus vite avec une passkey' })).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => {});
  });
});
