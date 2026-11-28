import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Login from './Login';
import source from './Login.tsx?raw';

describe('Login', () => {
  it('shows the sign-in card and refuses an empty submission without any request', () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    render(<Login />);
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Mot de passe oublié ?' }).getAttribute('href')).toBe('/forgot-password');
    expect(screen.queryByText('Se connecter avec le compte unique')).toBeNull();
    fireEvent.submit(document.querySelector('form'));
    // MAIR-1261 (F1 Cas 2): one message under each empty field.
    expect(screen.getAllByRole('alert').map((node) => node.textContent)).toEqual(['Renseignez votre email professionnel.', 'Renseignez votre mot de passe.']);
    expect(screen.getByLabelText(/Email professionnel/).getAttribute('aria-invalid')).toBe('true');
    // The page validates the form (noValidate) and moves the focus like the browser would.
    expect(document.activeElement).toBe(screen.getByLabelText(/Email professionnel/));
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('MAIR-866 F1: forgot-password is a lib link that keeps the requested module, and no « ou » appears without a passkey', () => {
    const { container } = render(<Login redirectUrl="https://projects.example.test/?p=1" />);
    const link = screen.getByRole('link', { name: 'Mot de passe oublié ?' });
    expect(link.getAttribute('href')).toBe('/forgot-password?redirect=https%3A%2F%2Fprojects.example.test%2F%3Fp%3D1');
    expect(link.getAttribute('data-m360-component')).toContain('LinkButton');
    // The only separator is the lib Divider under the brand block (MAIR-1102), never an « ou » in the form.
    expect(container.querySelector('form').querySelector('hr, [role="separator"]')).toBeNull();
    expect(screen.queryByRole('separator', { name: 'ou' })).toBeNull();
  });

  it('MAIR-866 F1: the passkey slot sits under the main action after an « ou » separator', () => {
    render(<Login passkeySlot={<button type="button">Se connecter avec une passkey</button>} />);
    const separator = screen.getByRole('separator', { name: 'ou' });
    const main = screen.getByRole('button', { name: 'Se connecter' });
    const passkey = screen.getByRole('button', { name: 'Se connecter avec une passkey' });
    expect(main.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(separator.compareDocumentPosition(passkey) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('MAIR-866 F1: the card is built from lib components only (no local field, no CSS-class link)', () => {
    expect(source).not.toMatch(/LoginField|<a\b/);
  });

  describe('MAIR-806 second step of a protected account', () => {
    const reply = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
    const signIn = () => {
      fireEvent.change(screen.getByLabelText(/Email professionnel/), { target: { value: 'alice@example.test' } });
      fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'fixture-password' } });
      fireEvent.submit(document.querySelector('form'));
    };

    it('business journey: password, then the code, then the requested module', async () => {
      const navigate = vi.fn();
      const fetchMock = vi.fn((url) => (url === '/api/auth/login' ? reply(200, { requiresTwoFactor: true }) : reply(200, { success: true })));
      vi.stubGlobal('fetch', fetchMock);
      render(<Login redirectUrl="https://projects.example.test/" navigate={navigate} />);
      signIn();
      expect(await screen.findByRole('heading', { name: 'Code de vérification' })).toBeTruthy();
      expect(screen.queryByLabelText(/Mot de passe/)).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText(/Code de vérification/), { target: { value: '492039' } });
      fireEvent.submit(document.querySelector('form'));
      await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://projects.example.test/'));
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/auth/login', '/api/auth/login/2fa', '/api/security-alert']);
      vi.unstubAllGlobals();
    });

    it('case 4: a login session that is over shows the sign-in form again with its alert', async () => {
      const fetchMock = vi.fn((url) => (url === '/api/auth/login' ? reply(200, { requiresTwoFactor: true }) : reply(401, { message: 'Votre session de connexion a expiré.', restartLogin: true })));
      vi.stubGlobal('fetch', fetchMock);
      render(<Login redirectUrl="https://projects.example.test/" navigate={vi.fn()} />);
      signIn();
      await screen.findByRole('heading', { name: 'Code de vérification' });
      fireEvent.change(screen.getByLabelText(/Code de vérification/), { target: { value: '123456' } });
      fireEvent.submit(document.querySelector('form'));
      expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeTruthy();
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('Votre session de connexion a expiré.');
      expect(alert.textContent).toContain('Saisissez de nouveau votre email et votre mot de passe.');
      expect(screen.getByLabelText(/Mot de passe/).value).toBe('');
      vi.unstubAllGlobals();
    });

    it('« Retour à la connexion » shows the sign-in form again', async () => {
      vi.stubGlobal('fetch', vi.fn(() => reply(200, { requiresTwoFactor: true })));
      render(<Login navigate={vi.fn()} />);
      signIn();
      await screen.findByRole('heading', { name: 'Code de vérification' });
      fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeTruthy();
      vi.unstubAllGlobals();
    });
  });

  describe('MAIR-809 mandatory second factor on an account that has none', () => {
    const reply = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
    const CODES = ['YOQM-3Y5S', '2ZXN-64EK', '7KNA-K6CC', 'FDGB-RIMD', 'WQZH-JFBF', 'HTET-ID44', 'K4CD-EDXC', '52CF-QF3J', '73KG-ZKVB', 'YHUI-67QX'];

    it('business journey: password, enrolment, backup codes, then the requested module', async () => {
      const navigate = vi.fn();
      const answers = {
        '/api/auth/login': () => reply(200, { requiresTwoFactorSetup: true, policy: { totp: true, passkey: false, backupCodes: true } }),
        '/api/auth/2fa/setup': () => reply(200, { secret: 'EXAMPLEKEYEXAMPL', otpauthUri: 'otpauth://totp/Mairie360:a@b.test?secret=EXAMPLEKEYEXAMPL' }),
        '/api/auth/2fa/confirm': () => reply(200, { success: true, backupCodes: CODES }),
      };
      const fetchMock = vi.fn((url) => answers[url]());
      vi.stubGlobal('fetch', fetchMock);
      render(<Login redirectUrl="https://projects.example.test/" navigate={navigate} />);
      fireEvent.change(screen.getByLabelText(/Email professionnel/), { target: { value: 'alice@example.test' } });
      fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'fixture-password' } });
      fireEvent.submit(document.querySelector('form'));
      expect(await screen.findByText('Ajoutez Mairie 360 à votre application')).toBeTruthy();
      expect(screen.queryByLabelText(/Mot de passe/)).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
      fireEvent.change(await screen.findByLabelText(/Code affiché par l’application/), { target: { value: '492039' } });
      fireEvent.submit(document.querySelector('form'));
      await screen.findByText('Enregistrez vos codes de secours');
      expect(navigate).not.toHaveBeenCalled();
      fireEvent.click(screen.getByLabelText('J’ai enregistré mes codes de secours en lieu sûr.'));
      fireEvent.submit(document.querySelector('form'));
      await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://projects.example.test/'), { timeout: 3000 });
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/auth/login', '/api/auth/2fa/setup', '/api/auth/2fa/confirm', '/api/security-alert']);
      vi.unstubAllGlobals();
    });

    it('an enrolment session that is over shows the sign-in form again with its alert', async () => {
      const answers = {
        '/api/auth/login': () => reply(200, { requiresTwoFactorSetup: true }),
        '/api/auth/2fa/setup': () => reply(401, { message: 'Votre session de connexion a expiré.', restartLogin: true }),
      };
      vi.stubGlobal('fetch', vi.fn((url) => answers[url]()));
      render(<Login navigate={vi.fn()} />);
      fireEvent.change(screen.getByLabelText(/Email professionnel/), { target: { value: 'alice@example.test' } });
      fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'fixture-password' } });
      fireEvent.submit(document.querySelector('form'));
      expect((await screen.findByRole('alert')).textContent).toContain('Votre session de connexion a expiré.');
      expect(screen.getByLabelText(/Mot de passe/)).toBeTruthy();
      expect(screen.queryByText('Ajoutez Mairie 360 à votre application')).toBeNull();
      vi.unstubAllGlobals();
    });
  });
});

describe('MAIR-811 F5 journey: sign in with a passkey from the sign-in card', () => {
  const OPTIONS = { id: 'ceremony-1', options: { publicKey: { challenge: 'q1w2e3r4', userVerification: 'required' } } };
  const bytes = (...values) => new Uint8Array(values).buffer;
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const stubPasskeys = (answer) => {
    function PublicKeyCredential() {}
    PublicKeyCredential.isConditionalMediationAvailable = async () => false;
    window.PublicKeyCredential = PublicKeyCredential;
    const get = vi.fn(async () => ({
      id: 'k3m9x7p2', rawId: bytes(1), type: 'public-key', getClientExtensionResults: () => ({}),
      response: { authenticatorData: bytes(2), clientDataJSON: bytes(3), signature: bytes(4), userHandle: null },
    }));
    Object.defineProperty(navigator, 'credentials', { configurable: true, value: { get } });
    const fetchMock = vi.fn(async (url) => (url === '/api/auth/passkey/options' ? json(200, OPTIONS) : answer));
    vi.stubGlobal('fetch', fetchMock);
    return { get, fetchMock };
  };
  const cleanup = () => { vi.unstubAllGlobals(); delete window.PublicKeyCredential; Reflect.deleteProperty(navigator, 'credentials'); };

  it('the passkey opens the session and sends the agent to the requested module, with no code step and no password request', async () => {
    const { fetchMock } = stubPasskeys(json(200, { success: true }));
    const navigate = vi.fn();
    render(<Login redirectUrl="https://projects.example.test/" navigate={navigate} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec une passkey' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('https://projects.example.test/'));
    const called = fetchMock.mock.calls.map(([url]) => url);
    // One challenge when the card loads (is the passkey available?) and a fresh single-use one for the click.
    // MAIR-773: then the pending security alert of the account (none here).
    expect(called).toEqual(['/api/auth/passkey/options', '/api/auth/passkey/options', '/api/auth/passkey', '/api/security-alert']);
    expect(called).not.toContain('/api/auth/login');
    expect(screen.queryByText('Code de vérification')).toBeNull();
    expect(screen.queryByText('Sécurisez votre compte')).toBeNull();
    cleanup();
  });

  it('a refused passkey keeps the agent on the sign-in card, where the password still works', async () => {
    stubPasskeys(json(401, { message: 'Cette passkey n’est pas reconnue.' }));
    const navigate = vi.fn();
    render(<Login redirectUrl="https://projects.example.test/" navigate={navigate} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Se connecter avec une passkey' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Cette passkey n’est pas reconnue.');
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Mot de passe/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeTruthy();
    cleanup();
  });

  it('the passkey is not offered while the first-login password change is shown', async () => {
    const fetchMock = vi.fn(async (url) => (url === '/api/auth/login' ? json(200, { requiresPasswordChange: true }) : json(200, OPTIONS)));
    stubPasskeys(json(200, { success: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Login redirectUrl="https://projects.example.test/" navigate={vi.fn()} />);
    await screen.findByRole('button', { name: 'Se connecter avec une passkey' });
    fireEvent.change(screen.getByLabelText(/Email professionnel/), { target: { value: 'agent@saint-andre.fr' } });
    fireEvent.change(screen.getByLabelText(/Mot de passe/), { target: { value: 'fixture-password-1' } });
    fireEvent.submit(document.querySelector('form'));
    await screen.findByRole('heading', { name: 'Nouveau mot de passe' });
    expect(screen.queryByRole('button', { name: 'Se connecter avec une passkey' })).toBeNull();
    cleanup();
  });
});
