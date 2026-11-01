import { NextResponse } from 'next/server.js';

export type SessionCookies = { accessToken: string; refreshToken: string; maxAge: number };
export type SessionCookieOptions = { secure: boolean; domain?: string };
const cookieValue = (value: unknown): value is string => typeof value === 'string' && /^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]+$/.test(value);

/** Read the published User Set-Cookie protocol, without adopting upstream cookie scopes. */
export function readSessionCookies(response: Response): SessionCookies | null | undefined {
  const headers = response.headers.getSetCookie();
  const sessionHeaders = headers.filter(header => ['accessToken', 'refreshToken'].some(name => header.trimStart().startsWith(name + '=')));
  if (!sessionHeaders.length) return undefined;
  for (const header of sessionHeaders) {
    const maxAge = header.match(/;\s*max-age\s*=\s*([^;]*)/i)?.[1].trim();
    if (maxAge !== undefined && (!/^-?\d+$/.test(maxAge) || !Number.isFinite(Number(maxAge)) || Number(maxAge) <= 0)) return null;
    const expires = header.match(/;\s*expires\s*=\s*([^;]*)/i)?.[1].trim();
    if (expires !== undefined && (!Number.isFinite(Date.parse(expires)) || Date.parse(expires) <= Date.now())) return null;
  }
  const cookies = new NextResponse(null, { headers: response.headers }).cookies;
  const access = cookies.get('accessToken'), refresh = cookies.get('refreshToken');
  if (!access || !refresh || !cookieValue(access.value) || !cookieValue(refresh.value)) return null;
  for (const name of ['accessToken', 'refreshToken']) if (sessionHeaders.filter(header => header.trimStart().startsWith(name + '=')).length !== 1) return null;
  const lifetime = (cookie: typeof access) => Math.min(Infinity,
    cookie.maxAge ?? Infinity,
    cookie.expires === undefined ? Infinity : Math.floor((cookie.expires.valueOf() - Date.now()) / 1000));
  const maxAge = Math.min(lifetime(access), accessCookieMaxAge(access.value));
  if (maxAge <= 0 || lifetime(refresh) <= 0) return null;
  return { accessToken: access.value, refreshToken: refresh.value, maxAge };
}

/** Bound browser lifetime to the JWT expiry; decoding is not authentication. */
export function accessCookieMaxAge(token: string): number {
  const part = token.split('.')[1];
  if (!part) return 3600;
  try {
    const claims: unknown = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    if (typeof claims !== 'object' || claims === null || !('exp' in claims) || typeof claims.exp !== 'number' || !Number.isSafeInteger(claims.exp)) return 3600;
    return Math.min(86400, Math.floor(claims.exp - Date.now() / 1000));
  } catch { return 3600; }
}

export function setSessionCookies(response: NextResponse, session: SessionCookies, options: SessionCookieOptions): void {
  if (!cookieValue(session.accessToken) || !cookieValue(session.refreshToken) || !Number.isFinite(session.maxAge) || session.maxAge <= 0) throw new Error('Invalid session cookie pair');
  const maxAge = Math.min(session.maxAge, accessCookieMaxAge(session.accessToken));
  if (maxAge <= 0) throw new Error('Expired session cookie pair');
  const common = { httpOnly: true, secure: options.secure, sameSite: 'strict' as const, ...(options.domain ? { domain: options.domain } : {}) };
  response.cookies.set('accessToken', session.accessToken, { ...common, path: '/', maxAge });
  response.cookies.set('refreshToken', session.refreshToken, { ...common, path: '/api', maxAge: 30 * 86400 });
}

export function clearSessionCookies(response: NextResponse, options: SessionCookieOptions): void {
  const common = { httpOnly: true, secure: options.secure, sameSite: 'strict' as const, expires: new Date(0), maxAge: 0, ...(options.domain ? { domain: options.domain } : {}) };
  response.cookies.set('accessToken', '', { ...common, path: '/' });
  response.cookies.set('refreshToken', '', { ...common, path: '/api' });
}

export function validSessionToken(token: string | undefined): token is string {
  return typeof token === 'string' && cookieValue(token);
}
