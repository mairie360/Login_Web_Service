import { NextResponse } from "next/server";

import { accessCookieMaxAge, setSessionCookies } from '@mairie360/front-kit/next';
export const getAccessTokenMaxAge = accessCookieMaxAge;

/** Sets the shared session cookies on `response`; false when the session is already expired. */
export function setAuthSessionCookies(response: NextResponse, accessToken: string, refreshToken: string, upstreamMaxAge = Infinity) {
  const maxAge = Math.min(getAccessTokenMaxAge(accessToken), upstreamMaxAge);
  if (maxAge <= 0) return false;
  const domain = process.env.COOKIE_DOMAIN?.trim();
  setSessionCookies(response, { accessToken, refreshToken, maxAge }, {
    secure: process.env.NODE_ENV === "production", domain,
  });
  return true;
}

/** The Login frontend owns the shared cookie attributes for login and recovery. */
export function createAuthSessionResponse(accessToken: string, refreshToken: string, upstreamMaxAge = Infinity) {
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  if (!setAuthSessionCookies(response, accessToken, refreshToken, upstreamMaxAge)) {
    return NextResponse.json({ message: "Le service de connexion a renvoyé une session expirée." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  return response;
}
