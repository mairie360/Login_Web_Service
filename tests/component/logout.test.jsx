import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Logout from '@/components/Logout';

let fetchMock;
const response = (ok) => ({ ok });

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('central logout handoff', () => {
  it('calls the existing BFF proxy before expiring the browser cookie, then returns to Login', async () => {
    fetchMock.mockResolvedValue(response(true));
    const navigate = vi.fn();
    render(<Logout navigate={navigate} />);

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

    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas abouti');
    expect(navigate).not.toHaveBeenCalled();
  });
});
