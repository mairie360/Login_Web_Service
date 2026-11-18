import type { TwoFactorSetupTokenView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../../lib/trusted-client-ip";
import { rejectUnsafeAuthRequest } from "../../../../../lib/auth-request";
import { clearTwoFactorSetupToken, TWO_FACTOR_SETUP_TOKEN_COOKIE } from "../../../../../lib/two-factor-token";
import { bffFailure, bffUnreachable, NO_STORE, refusalPath, tooManyAttempts } from "../../../../../lib/bff-refusal";

type EnrolmentStart = { secret?: unknown; otpauth_uri?: unknown };

/** The enrolment session is over (token expired or burnt, or the account got a factor meanwhile): back to the password. */
function enrolmentOver(message = "Votre session de connexion a expiré.", status = 401) {
  const response = NextResponse.json({ message, restartLogin: true }, { status, headers: NO_STORE });
  clearTwoFactorSetupToken(response);
  return response;
}

// Starts the enrolment of the authenticator application: the secret and the otpauth:// URI to register. Calling it again
// replaces the pending secret, so the front asks once per enrolment.
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request);
  if (rejected) return rejected;

  const token = request.cookies.get(TWO_FACTOR_SETUP_TOKEN_COOKIE)?.value ?? "";
  if (!token) return enrolmentOver();

  if (!configuredBffUrl()) {
    return NextResponse.json({ message: "Le service de connexion n’est pas configuré." }, { status: 503, headers: NO_STORE });
  }

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPostAuth2faSetupUrl()), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...trustedClientIpHeaders(request) },
      body: JSON.stringify({ token } satisfies TwoFactorSetupTokenView),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (upstreamResponse.status === 401) {
      return (await refusalPath(upstreamResponse)) === "body.token"
        ? enrolmentOver()
        : bffFailure(401, "La connexion a échoué. Veuillez réessayer.");
    }
    // The account got a second factor meanwhile: the password is enough to sign in normally.
    if (upstreamResponse.status === 409) return enrolmentOver("Votre compte est déjà sécurisé.", 409);
    if (upstreamResponse.status === 429) return tooManyAttempts(upstreamResponse);
    if (!upstreamResponse.ok) return bffFailure(upstreamResponse.status, "La connexion a échoué. Veuillez réessayer.");

    const { secret, otpauth_uri: otpauthUri } = ((await upstreamResponse.json().catch(() => ({}))) ?? {}) as EnrolmentStart;
    if (typeof secret !== "string" || !secret || typeof otpauthUri !== "string" || !otpauthUri) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une réponse invalide." }, { status: 502, headers: NO_STORE });
    }
    return NextResponse.json({ secret, otpauthUri }, { headers: NO_STORE });
  } catch (error) {
    return bffUnreachable(error);
  }
}
