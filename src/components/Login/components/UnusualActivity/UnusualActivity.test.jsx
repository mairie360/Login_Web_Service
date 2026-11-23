import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnusualActivity } from './UnusualActivity';
import { acknowledgeAlert, fetchPendingAlert, maskIpAddress } from './security-alert';

const alert = (level) => ({
  id: 12,
  level,
  ipAddress: '92.184.10.1',
  deviceInfo: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  createdAt: '2026-11-23T08:12:00+00:00',
});
const props = (extra = {}) => ({ alert: alert('certain'), email: 'agent@mairie.fr', isContinuing: false, onContinue: vi.fn(), onNotMe: vi.fn(), ...extra });

afterEach(() => vi.unstubAllGlobals());

describe('MAIR-773 UnusualActivity', () => {
  it('a certain attempt: error alert, the beginning of the address only, and both actions', () => {
    const handlers = props();
    render(<UnusualActivity {...handlers} />);
    expect(screen.getByText('Activité inhabituelle sur votre compte')).toBeTruthy();
    expect(screen.getByText('Quelqu’un a essayé d’utiliser votre session depuis un autre appareil.')).toBeTruthy();
    expect(screen.getByText('92.184.xxx.xxx')).toBeTruthy();
    expect(screen.queryByText('92.184.10.1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'J’ai compris, continuer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ce n’était pas moi : changer mon mot de passe' }));
    expect([handlers.onContinue.mock.calls.length, handlers.onNotMe.mock.calls.length]).toEqual([1, 1]);
  });

  it('a possible use: warning alert and « C’était moi »; the actions wait while the alert is marked read', () => {
    render(<UnusualActivity {...props({ alert: alert('possible'), isContinuing: true })} />);
    expect(screen.getByText('Votre session a été utilisée depuis une autre connexion, peut-être vous après un changement de réseau.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ce n’était pas moi : changer mon mot de passe' }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /C’était moi, continuer/ })).toBeTruthy();
  });

  it('an unknown device and address read as such', () => {
    render(<UnusualActivity {...props({ alert: { ...alert('certain'), deviceInfo: null, ipAddress: null } })} />);
    expect(screen.getByText('Appareil inconnu')).toBeTruthy();
    expect(screen.getByText('Inconnue')).toBeTruthy();
  });
});

describe('MAIR-773 security-alert helpers', () => {
  it('only the beginning of an address is shown', () => {
    expect(maskIpAddress('92.184.10.1')).toBe('92.184.xxx.xxx');
    expect(maskIpAddress('2001:db8:85a3::8a2e:370:7334')).toBe('2001:db8:85a3:xxxx::');
    expect(maskIpAddress('')).toBe('Inconnue');
    expect(maskIpAddress('not an address')).toBe('Inconnue');
  });

  it('reads the pending alert and falls back to none on any failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ alert: alert('certain') }) })));
    expect((await fetchPendingAlert()).id).toBe(12);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    expect(await fetchPendingAlert()).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await fetchPendingAlert()).toBeNull();
  });

  it('marks the alert read, and ignores a failure', async () => {
    const fetch = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    await acknowledgeAlert(12);
    expect(fetch).toHaveBeenCalledWith('/api/security-alert/acknowledge', expect.objectContaining({ method: 'POST', body: JSON.stringify({ id: 12 }) }));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(acknowledgeAlert(12)).resolves.toBeUndefined();
  });
});
