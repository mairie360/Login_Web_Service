import { NextRequest, NextResponse } from "next/server";
import { resolveLoginRedirect } from "../../../../lib/login-redirect";
import {
  KEYCLOAK_LOGIN_COOKIE,
  KEYCLOAK_LOGIN_COOKIE_PATH,
  KEYCLOAK_LOGIN_MAX_AGE,
  keycloakSettings,
  loginPageUrl,
  startKeycloakLogin,
} from "../../../../lib/keycloak-login";

const seeOther = (location: string) => new NextResponse(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });

/** Starts the Keycloak sign-in (MAIR-153): `/api/auth/keycloak?redirect=<module URL>` → realm authorization page. */
export function GET(request: NextRequest) {
  const redirect = resolveLoginRedirect(request.nextUrl.searchParams.get("redirect") ?? undefined);
  const settings = keycloakSettings();
  if (!settings) return seeOther(loginPageUrl("unconfigured", redirect));
  if (!redirect) return seeOther("/");

  const { authorizationUrl, cookie } = startKeycloakLogin(settings, redirect);
  const response = seeOther(authorizationUrl);
  // Lax, not Strict: the callback is a top-level navigation coming back from the realm.
  response.cookies.set(KEYCLOAK_LOGIN_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: KEYCLOAK_LOGIN_COOKIE_PATH,
    maxAge: KEYCLOAK_LOGIN_MAX_AGE,
  });
  return response;
}
