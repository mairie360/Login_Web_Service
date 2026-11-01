import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Logout from '@/components/Logout';
import LogoutPage from '@/app/logout/page';
import { StrictMode } from 'react';

let fetchMock;
const response = (body = { message: 'Session closed', session_revoked: true }, status = 200) => Response.json(body, { status });
const startLogout = () => fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter' }));
beforeEach(() => { fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe('central logout receipt', () => {
  it('waits for an explicit action and keeps the standalone page on error', async () => {
    fetchMock.mockResolvedValue(response({ message: 'Unavailable' },503));render(<LogoutPage />);expect(fetchMock).not.toHaveBeenCalled();startLogout();
    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas abouti');expect(screen.getByRole('heading',{name:'Déconnexion'})).toBeTruthy();expect(document.querySelector('header, aside, nav, footer')).toBeNull();
  });
  it('calls one JSON owner endpoint and returns to Login after confirmed revocation',async()=>{
    fetchMock.mockResolvedValue(response());const navigate=vi.fn();render(<Logout navigate={navigate}/>);startLogout();await waitFor(()=>expect(navigate).toHaveBeenCalledExactlyOnceWith('/'));
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/auth/logout',expect.objectContaining({method:'POST',credentials:'same-origin',cache:'no-store',body:'{}',headers:{'Content-Type':'application/json'}}));
  });
  it('offers an explicit retry after a refusal without navigating',async()=>{
    fetchMock.mockResolvedValueOnce(response({message:'Unavailable'},503)).mockResolvedValue(response());const navigate=vi.fn();render(<Logout navigate={navigate}/>);startLogout();await screen.findByRole('alert');expect(navigate).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));await waitFor(()=>expect(navigate).toHaveBeenCalledExactlyOnceWith('/'));expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('keeps an unauthorized owner response visible instead of claiming revocation',async()=>{
    fetchMock.mockResolvedValue(response({message:'Unauthorized'},401));const navigate=vi.fn();render(<Logout navigate={navigate}/>);startLogout();await screen.findByRole('alert');expect(navigate).not.toHaveBeenCalled();expect(fetchMock).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Réessayer'}).disabled).toBe(false);
  });
  it('shows local-only closure and waits for an explicit return when Core revocation is unconfirmed',async()=>{
    fetchMock.mockResolvedValue(response({message:'Unconfirmed',session_revoked:false}));const navigate=vi.fn();render(<Logout navigate={navigate}/>);startLogout();expect((await screen.findByRole('alert')).textContent).toContain('session serveur n’a pas pu être confirmée');expect(navigate).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Se déconnecter'})).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Retour à la connexion'}));expect(navigate).toHaveBeenCalledExactlyOnceWith('/');expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('navigates to the validated Keycloak end-session receipt after Core confirmation',async()=>{
    const url='https://auth.dev.mairie360-eip.fr/realms/mairie360/protocol/openid-connect/logout?client_id=mairie360';fetchMock.mockResolvedValue(response({message:'Closed',session_revoked:true,logout_url:url}));const navigate=vi.fn();render(<Logout navigate={navigate}/>);startLogout();await waitFor(()=>expect(navigate).toHaveBeenCalledExactlyOnceWith(url));
  });
  it('rejects malformed receipts and unsafe end-session destinations',async()=>{
    fetchMock.mockResolvedValue(response({message:'Closed',session_revoked:true,logout_url:'javascript:alert(1)'}));const navigate=vi.fn();render(<Logout navigate={navigate}/>);startLogout();await screen.findByRole('alert');expect(navigate).not.toHaveBeenCalled();
  });
  it('keeps one request through StrictMode and repeated synchronous commands',async()=>{
    let release;fetchMock.mockImplementation(()=>new Promise(resolve=>{release=resolve;}));const navigate=vi.fn();render(<StrictMode><Logout navigate={navigate}/></StrictMode>);expect(fetchMock).not.toHaveBeenCalled();const command=screen.getByRole('button',{name:'Se déconnecter'});fireEvent.click(command);fireEvent.click(command);expect(fetchMock).toHaveBeenCalledTimes(1);release(response());await waitFor(()=>expect(navigate).toHaveBeenCalledExactlyOnceWith('/'));
  });
});
