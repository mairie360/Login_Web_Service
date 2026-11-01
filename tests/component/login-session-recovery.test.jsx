import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '@/components/Login';

const target = 'https://projects.example.invalid/?project=retained&task=42';
let transport;
beforeEach(() => { transport = vi.fn(); vi.stubGlobal('fetch', transport); });
const gate = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

describe('existing Login form restores a page session through the owner POST', () => {
  it('does not attempt a renewal during ordinary sign-in', () => {
    render(<Login redirectUrl={target} navigate={vi.fn()} />);
    expect(transport).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Se connecter' }).disabled).toBe(false);
    expect(screen.queryByText('Reprise de votre session…')).toBeNull();
  });

  it('keeps the form locked during renewal and shares one request across Strict Mode replay', async () => {
    const pending = gate(); transport.mockReturnValue(pending.promise);
    const navigate = vi.fn();
    render(<StrictMode><Login redirectUrl={target} navigate={navigate} resumeSession /></StrictMode>);
    expect(screen.getByRole('status').textContent).toBe('Reprise de votre session…');
    expect(screen.getByRole('textbox', { name: 'Email professionnel' }).disabled).toBe(true);
    act(() => { fireEvent.submit(document.querySelector('form')); fireEvent.submit(document.querySelector('form')); });
    expect(transport).toHaveBeenCalledTimes(1);
    const [url, options] = transport.mock.calls[0];
    expect(url).toBe('/api/auth/refresh');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('same-origin');
    expect(JSON.parse(options.body)).toEqual({});
    expect(new Headers(options.headers).get('authorization')).toBeNull();
    await act(async () => pending.resolve(Response.json({ message: 'Session renouvelée.' })));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(target);
    expect(document.querySelector('aside')).toBeNull();
  });

  it.each([401, 403, 429, 503])('owner%d keeps useful feedback and permits ordinary sign-in', async status => {
    const navigate = vi.fn();
    transport.mockResolvedValueOnce(Response.json({ message: 'Internal owner detail' }, { status }));
    render(<Login redirectUrl={target} navigate={navigate} resumeSession />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(status === 401 ? 'Votre session a expiré' : 'temporairement indisponible');
    expect(alert.textContent).not.toMatch(/Internal|BFF|401|403|429|503/);
    expect(screen.getByRole('button', { name: 'Se connecter' }).disabled).toBe(false);
    expect(screen.getByRole('textbox', { name: 'Email professionnel' }).disabled).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(transport).toHaveBeenCalledTimes(1);
    transport.mockResolvedValueOnce(Response.json({ success: true }));
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: 'Email professionnel' }), 'disposable@example.invalid');
    await user.type(screen.getByLabelText('Mot de passe', { exact: true }), 'disposable-password');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(target));
    expect(transport.mock.calls.map(([url]) => url)).toEqual(['/api/auth/refresh', '/api/auth/login']);
  });

  it.each([null, { message: 42 }, { message: '' }, { access_token: 'disposable-token' }])('rejects malformed renewal receipt%j without navigation', async body => {
    transport.mockResolvedValue(Response.json(body));
    const navigate = vi.fn(); render(<Login redirectUrl={target} navigate={navigate} resumeSession />);
    expect((await screen.findByRole('alert')).textContent).toContain('temporairement indisponible');
    expect(navigate).not.toHaveBeenCalled();
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('a network failure does not revoke or erase unrelated local data', async () => {
    localStorage.setItem('unrelated.page.preference', 'keep');
    transport.mockRejectedValue(new TypeError('fixture network failure'));
    render(<Login redirectUrl={target} navigate={vi.fn()} resumeSession />);
    expect((await screen.findByRole('alert')).textContent).toContain('temporairement indisponible');
    expect(localStorage.getItem('unrelated.page.preference')).toBe('keep');
    expect(transport.mock.calls.map(([url]) => url)).toEqual(['/api/auth/refresh']);
    localStorage.removeItem('unrelated.page.preference');
  });

  it('a late receipt cannot navigate after the form is unmounted', async () => {
    const pending = gate(); transport.mockReturnValue(pending.promise);
    const navigate = vi.fn(); const view = render(<Login redirectUrl={target} navigate={navigate} resumeSession />);
    view.unmount();
    await act(async () => pending.resolve(Response.json({ message: 'Session renouvelée.' })));
    expect(navigate).not.toHaveBeenCalled();
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('a refused browser navigation leaves the normal form available', async () => {
    transport.mockResolvedValue(Response.json({ message: 'Session renouvelée.' }));
    render(<Login redirectUrl={target} navigate={() => { throw new Error('disposable navigation failure'); }} resumeSession />);
    expect((await screen.findByRole('alert')).textContent).toContain('temporairement indisponible');
    expect(screen.getByRole('button', { name: 'Se connecter' }).disabled).toBe(false);
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
