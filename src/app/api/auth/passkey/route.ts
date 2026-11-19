import type { PasskeyLoginView } from "@mairie360/bff-user-openapi/model";
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../lib/trusted-client-ip";
import { rejectUnsafeAuthRequest } from "../../../../lib/auth-request";
import { createAuthSessionResponse } from "../../../../lib/auth-session";
import { readBffCookieSession } from "../../../../lib/bff-session-cookies";
import { bffFailure, bffUnreachable, NO_STORE, tooManyAttempts } from "../../../../lib/bff-refusal";

type PasskeyBody = { id?: unknown; credential?: unknown };

// PasskeyLoginView (bff-user-openapi): the ceremony id is 1 to 512 characters.
const CEREMONY_ID_MAX_LENGTH = 512;

/**
 * Sends the signed WebAuthn answer to BFF User and opens the session like the password login. A passkey is a complete
 * sign-in: no second factor is asked afterwards. Every BFF refusal of the passkey is the same 401.
 */
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request, true);
  if (rejected) return rejected;

  let body: PasskeyBody;
  try {
    body = (await request.json()) as PasskeyBody;
  } catch {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const credential = body.credential;
  if (!id || id.length > CEREMONY_ID_MAX_LENGTH || typeof credential !== "object" || credential === null || Array.isArray(credential)) {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }

  if (!configuredBffUrl()) {
    return NextResponse.json({ message: "Le service de connexion n’est pas configuré." }, { status: 503, headers: NO_STORE });
  }

  const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
  if (process.env.NODE_ENV === "production" && !cookieDomain) {
    return NextResponse.json({ message: "La session partagée n’est pas configurée." }, { status: 503, headers: NO_STORE });
  }

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPostAuthPasskeyUrl()), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...trustedClientIpHeaders(request) },
      body: JSON.stringify({
        id,
        credential: credential as Record<string, unknown>,
        device_info: request.headers.get("user-agent") || "Navigateur inconnu",
      } satisfies PasskeyLoginView),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (upstreamResponse.status === 401) {
      return NextResponse.json({ message: "Cette passkey n’est pas reconnue.", reason: "unknown-passkey" }, { status: 401, headers: NO_STORE });
    }
    if (upstreamResponse.status === 403) {
      return NextResponse.json({ message: "Ce compte est désactivé.", reason: "disabled" }, { status: 403, headers: NO_STORE });
    }
    if (upstreamResponse.status === 429) return tooManyAttempts(upstreamResponse);
    if (upstreamResponse.status === 503) {
      return NextResponse.json(
        { message: "Connexion par passkey indisponible pour le moment. Utilisez votre mot de passe.", reason: "unavailable" },
        { status: 503, headers: NO_STORE },
      );
    }
    if (!upstreamResponse.ok) return bffFailure(upstreamResponse.status, "La connexion par passkey a échoué. Veuillez réessayer.");

    const cookieSession = readBffCookieSession(upstreamResponse);
    if (!cookieSession?.accessToken || !cookieSession.refreshToken) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une réponse invalide." }, { status: 502, headers: NO_STORE });
    }
    return createAuthSessionResponse(cookieSession.accessToken, cookieSession.refreshToken, cookieSession.maxAge);
  } catch (error) {
    return bffUnreachable(error);
  }
}
