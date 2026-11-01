import type { KeycloakLoginView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../../lib/trusted-client-ip";
import { setAuthSessionCookies } from "../../../../../lib/auth-session";
import { readBffCookieSession } from "../../../../../lib/bff-session-cookies";
import { resolveLoginRedirect } from "../../../../../lib/login-redirect";
import {
  KEYCLOAK_LOGIN_COOKIE,
  KEYCLOAK_LOGIN_COOKIE_PATH,
  type KeycloakLoginError,
  keycloakSettings,
  loginPageUrl,
  readKeycloakLoginState,
} from "../../../../../lib/keycloak-login";

/** BFF User statuses of `POST /auth/keycloak` the page explains; anything else means the service is unavailable. */
const UPSTREAM_ERRORS: Record<number, KeycloakLoginError> = { 401: "expired", 403: "account", 429: "busy", 503: "unconfigured" };

function seeOther(location: string) {
  const response = new NextResponse(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
  // The state, nonce and verifier are single-use, whatever the outcome.
  response.cookies.set(KEYCLOAK_LOGIN_COOKIE, "", { httpOnly: true, path: KEYCLOAK_LOGIN_COOKIE_PATH, expires: new Date(0), maxAge: 0 });
  return response;
}

async function hasSessionMessage(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  return typeof body === "object" && body !== null && "message" in body && typeof body.message === "string";
}

/** Return of the Keycloak sign-in (MAIR-153): redeems the code through BFF User, then opens the requested module. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const login = readKeycloakLoginState(request.cookies.get(KEYCLOAK_LOGIN_COOKIE)?.value);
  const redirect = resolveLoginRedirect(login?.redirect);
  const fail = (error: KeycloakLoginError) => seeOther(loginPageUrl(error, redirect));

  const keycloakError = params.get("error");
  if (keycloakError) return fail(keycloakError === "access_denied" ? "cancelled" : keycloakError === "temporarily_unavailable" ? "unavailable" : "expired");
  const code = params.get("code");
  if (!login || !code || params.get("state") !== login.state || !redirect) return fail("expired");

  const settings = keycloakSettings();
  if (!settings) return fail("unconfigured");
  if (!configuredBffUrl() || (process.env.NODE_ENV === "production" && !process.env.COOKIE_DOMAIN?.trim())) return fail("unavailable");

  try {
    const upstream = await fetch(bffUserUrl(bffUserOperations.getPostAuthKeycloakUrl()), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...trustedClientIpHeaders(request) },
      body: JSON.stringify({
        code,
        redirect_uri: settings.redirectUri,
        code_verifier: login.verifier,
        nonce: login.nonce,
        // KeycloakLoginView requires a device description, like LoginView.
        device_info: request.headers.get("user-agent") || "Navigateur inconnu",
      } satisfies KeycloakLoginView),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      return fail(UPSTREAM_ERRORS[upstream.status] ?? "unavailable");
    }
    const session = readBffCookieSession(upstream);
    if (!session || !(await hasSessionMessage(upstream))) return fail("unavailable");

    const response = seeOther(redirect);
    return setAuthSessionCookies(response, session.accessToken, session.refreshToken, session.maxAge) ? response : fail("unavailable");
  } catch {
    return fail("unavailable");
  }
}
