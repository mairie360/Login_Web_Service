import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Logout from './Logout';

describe('Logout', () => {
  it('revokes the session and leaves for the confirmed destination', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ session_revoked: true }) }));
    const navigate = vi.fn();
    render(<Logout navigate={navigate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(navigate).toHaveBeenCalledWith('/');
    vi.unstubAllGlobals();
  });
  it('offers a retry when the logout fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<Logout navigate={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
    expect(screen.getByRole('alert').textContent).toContain('La déconnexion n’a pas abouti');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
