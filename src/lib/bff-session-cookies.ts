import { NextResponse } from "next/server";

/** Read the cookie-only session published by BFF User without relaying its cookie scopes. */
export function readBffCookieSession(response: Response) {
  const rawCookies = response.headers.getSetCookie();
  const sessionHeaders = rawCookies.filter(header => ["accessToken", "refreshToken"].some(name => header.trimStart().startsWith(name + "=")));
  // The cookie parser can omit a zero Max-Age. Validate wire expiry attributes before normalization.
  for (const header of sessionHeaders) {
    const maxAge = header.match(/;\s*max-age\s*=\s*([^;]*)/i)?.[1].trim();
    if (maxAge !== undefined && (!/^-?\d+$/.test(maxAge) || !Number.isFinite(Number(maxAge)) || Number(maxAge) <= 0)) return null;
    const expires = header.match(/;\s*expires\s*=\s*([^;]*)/i)?.[1].trim();
    if (expires !== undefined && (!Number.isFinite(Date.parse(expires)) || Date.parse(expires) <= Date.now())) return null;
  }
  const cookies = new NextResponse(null, { headers: response.headers }).cookies;
  const access = cookies.get("accessToken");
  const refresh = cookies.get("refreshToken");
  if (!access && !refresh && sessionHeaders.length === 0) return undefined;

  // An incomplete/deleted cookie session must not fall back to a conflicting legacy token pair.
  const validValue = (value: string) => /^[\x21\x23-\x2b\x2d-\x3a\x3c-\x5b\x5d-\x7e]+$/.test(value);
  if (!access || !refresh || !validValue(access.value) || !validValue(refresh.value)) return null;
  for (const name of ["accessToken", "refreshToken"]) {
    if (rawCookies.filter(header => header.trimStart().startsWith(name + "=")).length > 1) return null;
  }

  const lifetime = (cookie: NonNullable<typeof access>) => {
    const limits: number[] = [];
    if (cookie.maxAge !== undefined) limits.push(cookie.maxAge);
    if (cookie.expires !== undefined) {
      const expiresAt = cookie.expires.valueOf();
      limits.push(Math.floor((expiresAt - Date.now()) / 1000));
    }
    return Math.min(Infinity, ...limits);
  };
  const maxAge = lifetime(access);
  if (maxAge <= 0 || lifetime(refresh) <= 0) return null;
  return { accessToken: access.value, refreshToken: refresh.value, maxAge };
}
