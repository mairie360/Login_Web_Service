import { NextResponse } from "next/server";

import { accessCookieMaxAge, setSessionCookies } from '@mairie360/front-kit/next';
export const getAccessTokenMaxAge = accessCookieMaxAge;

/** The Login frontend owns the shared cookie attributes for login and recovery. */
export function createAuthSessionResponse(accessToken: string, refreshToken: string, upstreamMaxAge = Infinity) {
  const maxAge = Math.min(getAccessTokenMaxAge(accessToken), upstreamMaxAge);
  if (maxAge <= 0) {
    return NextResponse.json({ message: "Le service de connexion a renvoyé une session expirée." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  const domain = process.env.COOKIE_DOMAIN?.trim();
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  setSessionCookies(response, { accessToken, refreshToken, maxAge }, {
    secure: process.env.NODE_ENV === "production", domain,
  });
  return response;
}
