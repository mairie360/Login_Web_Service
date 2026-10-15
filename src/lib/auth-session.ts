import { NextResponse } from "next/server";

const ACCESS_TOKEN_MAX_AGE = 24 * 60 * 60;
const UNKNOWN_ACCESS_TOKEN_MAX_AGE = 60 * 60;

export function getAccessTokenMaxAge(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return UNKNOWN_ACCESS_TOKEN_MAX_AGE;

  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof claims !== "object" || claims === null || !("exp" in claims)) {
      return UNKNOWN_ACCESS_TOKEN_MAX_AGE;
    }
    const exp = claims.exp;
    if (typeof exp !== "number" || !Number.isSafeInteger(exp)) {
      return UNKNOWN_ACCESS_TOKEN_MAX_AGE;
    }
    return Math.min(ACCESS_TOKEN_MAX_AGE, Math.floor(exp - Date.now() / 1000));
  } catch {
    // Keep opaque or malformed tokens short-lived without exposing their content.
    return UNKNOWN_ACCESS_TOKEN_MAX_AGE;
  }
}


/** The Login frontend owns the shared cookie attributes for login and recovery. */
export function createAuthSessionResponse(accessToken: string, refreshToken: string, upstreamMaxAge = Infinity) {
  const maxAge = Math.min(getAccessTokenMaxAge(accessToken), upstreamMaxAge);
  if (maxAge <= 0) {
    return NextResponse.json({ message: "Le service de connexion a renvoyé une session expirée." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  const domain = process.env.COOKIE_DOMAIN?.trim();
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  const shared = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, ...(domain ? { domain } : {}) };
  response.cookies.set("accessToken", accessToken, { ...shared, path: "/", maxAge });
  response.cookies.set("refreshToken", refreshToken, { ...shared, path: "/api" });
  return response;
}
