import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Logout from '@/components/Logout';
import LogoutPage from '@/app/logout/page';
import { StrictMode } from 'react';

let fetchMock;
const response = (ok) => ({ ok });
const startLogout = () => fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('central logout handoff', () => {
  it('renders the logout page without application navigation or footer on error', async () => {
    fetchMock.mockResolvedValue(response(false));
    render(<LogoutPage />);
    expect(fetchMock).not.toHaveBeenCalled();
    startLogout();
    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas abouti');
    expect(screen.getByRole('heading', { name: 'Déconnexion' })).toBeTruthy();
    expect(document.querySelector('header, aside, nav, footer')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByText(/©.*Mairie360/)).toBeNull();
  });
  it('calls the existing BFF proxy before expiring the browser cookie, then returns to Login', async () => {
    fetchMock.mockResolvedValue(response(true));
    const navigate = vi.fn();
    render(<Logout navigate={navigate} />);

    expect(fetchMock).not.toHaveBeenCalled();
    startLogout();

    await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith('/'));
    expect(fetchMock.mock.calls.map(([url, options]) => [url, options.method, options.credentials])).toEqual([
      ['/auth/logout', 'POST', 'same-origin'],
      ['/api/auth/logout', 'POST', 'same-origin'],
    ]);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the user on the page and offers retry when BFF logout fails', async () => {
    fetchMock.mockResolvedValueOnce(response(false)).mockResolvedValue(response(true));
    const navigate = vi.fn();
    render(<Logout navigate={navigate} />);

    startLogout();

    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas abouti');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith('/'));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not redirect when the frontend cookie expiry fails', async () => {
    fetchMock.mockResolvedValueOnce(response(true)).mockResolvedValueOnce(response(false));
    const navigate = vi.fn();
    render(<Logout navigate={navigate} />);

    startLogout();

    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas abouti');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('waits through StrictMode mounting and recovers an unauthorized session only after an explicit action', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 }).mockResolvedValueOnce(response(true));
    const navigate = vi.fn();
    render(<StrictMode><Logout navigate={navigate} /></StrictMode>);
    expect(fetchMock).not.toHaveBeenCalled();
    startLogout();
    await waitFor(() => expect(navigate).toHaveBeenCalledExactlyOnceWith('/'));
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/auth/logout', '/api/auth/logout']);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the rejection visible when401 is followed by refused local expiry', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 }).mockResolvedValueOnce(response(false));
    const navigate = vi.fn();
    render(<Logout navigate={navigate} />);
    startLogout();
    await screen.findByRole('alert');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/auth/logout', '/api/auth/logout']);
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Réessayer' }).disabled).toBe(false);
  });
});
