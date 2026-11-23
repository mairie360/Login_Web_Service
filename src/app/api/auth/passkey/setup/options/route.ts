import type { TwoFactorSetupTokenView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../../../lib/trusted-client-ip";
import { rejectUnsafeAuthRequest } from "../../../../../../lib/auth-request";
import { TWO_FACTOR_SETUP_TOKEN_COOKIE } from "../../../../../../lib/two-factor-token";
import { bffFailure, bffUnreachable, NO_STORE, refusalPath, tooManyAttempts } from "../../../../../../lib/bff-refusal";
import { enrolmentOver } from "../../../../../../lib/enrolment-over";

const UNAVAILABLE = "La création d’une passkey est indisponible pour le moment.";

/**
 * Starts the creation of a passkey during the mandatory enrolment: the enrolment token of the cookie goes to BFF User,
 * the WebAuthn creation options come back. Nothing is stored: the browser answers to `POST /api/auth/passkey/setup`.
 */
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request);
  if (rejected) return rejected;

  const token = request.cookies.get(TWO_FACTOR_SETUP_TOKEN_COOKIE)?.value ?? "";
  if (!token) return enrolmentOver();

  if (!configuredBffUrl()) {
    return NextResponse.json({ message: "Le service de connexion n’est pas configuré." }, { status: 503, headers: NO_STORE });
  }

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPostAuthPasskeySetupOptionsUrl()), {
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
    if (upstreamResponse.status === 403) {
      return NextResponse.json({ message: "Votre mairie n’accepte pas les passkeys.", reason: "not-accepted" }, { status: 403, headers: NO_STORE });
    }
    if (upstreamResponse.status === 429) return tooManyAttempts(upstreamResponse);
    // No WebAuthn relying party on this instance.
    if (upstreamResponse.status === 503) return NextResponse.json({ message: UNAVAILABLE, reason: "unavailable" }, { status: 503, headers: NO_STORE });
    if (!upstreamResponse.ok) return bffFailure(upstreamResponse.status, "La création de la passkey a échoué. Veuillez réessayer.");

    const body = (await upstreamResponse.json().catch(() => undefined)) as { options?: unknown } | undefined;
    if (typeof body?.options !== "object" || body.options === null) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une réponse invalide." }, { status: 502, headers: NO_STORE });
    }
    return NextResponse.json({ options: body.options }, { headers: NO_STORE });
  } catch (error) {
    return bffUnreachable(error);
  }
}
