import type { PasskeySetupView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../../lib/trusted-client-ip";
import { rejectUnsafeAuthRequest } from "../../../../../lib/auth-request";
import { setAuthSessionCookies } from "../../../../../lib/auth-session";
import { readBffCookieSession } from "../../../../../lib/bff-session-cookies";
import { clearTwoFactorSetupToken, TWO_FACTOR_SETUP_TOKEN_COOKIE } from "../../../../../lib/two-factor-token";
import { bffFailure, bffUnreachable, NO_STORE, refusalPath, tooManyAttempts } from "../../../../../lib/bff-refusal";
import { enrolmentOver } from "../../../../../lib/enrolment-over";

type SetupBody = { label?: unknown; credential?: unknown };

// PasskeySetupView (bff-user-openapi): the name is 1 to 100 characters.
const LABEL_MAX_LENGTH = 100;

/**
 * Finishes the creation of a passkey during the mandatory enrolment: the browser answer and the name go to BFF User with
 * the enrolment token of the cookie. The session opens like a sign-in; a passkey comes with no backup codes.
 */
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request, true);
  if (rejected) return rejected;

  let body: SetupBody | null;
  try {
    body = (await request.json()) as SetupBody | null;
  } catch {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label || label.length > LABEL_MAX_LENGTH) {
    return NextResponse.json({ message: "Donnez un nom à votre passkey (100 caractères au plus).", reason: "label" }, { status: 400, headers: NO_STORE });
  }
  if (typeof body.credential !== "object" || body.credential === null || Array.isArray(body.credential)) {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }

  const token = request.cookies.get(TWO_FACTOR_SETUP_TOKEN_COOKIE)?.value ?? "";
  if (!token) return enrolmentOver();

  if (!configuredBffUrl()) {
    return NextResponse.json({ message: "Le service de connexion n’est pas configuré." }, { status: 503, headers: NO_STORE });
  }

  const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
  if (process.env.NODE_ENV === "production" && !cookieDomain) {
    return NextResponse.json({ message: "La session partagée n’est pas configurée." }, { status: 503, headers: NO_STORE });
  }

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPostAuthPasskeySetupUrl()), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...trustedClientIpHeaders(request) },
      body: JSON.stringify({ token, label, credential: body.credential as PasskeySetupView["credential"] } satisfies PasskeySetupView),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (upstreamResponse.status === 401) {
      return (await refusalPath(upstreamResponse)) === "body.token"
        ? enrolmentOver()
        : bffFailure(401, "La connexion a échoué. Veuillez réessayer.");
    }
    // The browser answer was refused (wrong challenge, replayed, malformed): the agent can try again.
    if (upstreamResponse.status === 400) {
      return NextResponse.json({ message: "La passkey n’a pas pu être vérifiée.", reason: "refused" }, { status: 400, headers: NO_STORE });
    }
    // The account got a second factor meanwhile: the password is enough to sign in normally.
    if (upstreamResponse.status === 409) return enrolmentOver("Votre compte est déjà sécurisé.", 409);
    if (upstreamResponse.status === 404) return enrolmentOver();
    if (upstreamResponse.status === 403) {
      return NextResponse.json({ message: "Votre mairie n’accepte pas les passkeys.", reason: "not-accepted" }, { status: 403, headers: NO_STORE });
    }
    if (upstreamResponse.status === 429) return tooManyAttempts(upstreamResponse);
    if (!upstreamResponse.ok) return bffFailure(upstreamResponse.status, "La création de la passkey a échoué. Veuillez réessayer.");

    const cookieSession = readBffCookieSession(upstreamResponse);
    if (!cookieSession?.accessToken || !cookieSession.refreshToken) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une réponse invalide." }, { status: 502, headers: NO_STORE });
    }

    const response = NextResponse.json({ success: true }, { headers: NO_STORE });
    if (!setAuthSessionCookies(response, cookieSession.accessToken, cookieSession.refreshToken, cookieSession.maxAge)) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une session expirée." }, { status: 502, headers: NO_STORE });
    }
    clearTwoFactorSetupToken(response);
    return response;
  } catch (error) {
    return bffUnreachable(error);
  }
}
