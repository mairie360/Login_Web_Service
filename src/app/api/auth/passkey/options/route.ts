import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../../lib/trusted-client-ip";
import { rejectUnsafeAuthRequest } from "../../../../../lib/auth-request";
import { bffFailure, bffUnreachable, NO_STORE, tooManyAttempts } from "../../../../../lib/bff-refusal";

const UNAVAILABLE = "Connexion par passkey indisponible pour le moment. Utilisez votre mot de passe.";

function unavailable() {
  return NextResponse.json({ message: UNAVAILABLE, reason: "unavailable" }, { status: 503, headers: NO_STORE });
}

/**
 * Starts a discoverable passkey sign-in: the browser offers the passkeys it holds for the site, nobody types an
 * e-mail. Answers `{ id, options }`; the `id` (single use, two minutes) goes back with the browser answer to
 * `POST /api/auth/passkey`. The BFF messages are technical English: the interface only reads the status and `reason`.
 */
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request);
  if (rejected) return rejected;

  if (!configuredBffUrl()) return unavailable();

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPostAuthPasskeyOptionsUrl()), {
      method: "POST",
      headers: { Accept: "application/json", ...trustedClientIpHeaders(request) },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    // The mairie does not accept passkeys (two-factor policy): the button is not offered.
    if (upstreamResponse.status === 403) {
      return NextResponse.json({ message: "Les passkeys ne sont pas acceptées.", reason: "not-accepted" }, { status: 403, headers: NO_STORE });
    }
    if (upstreamResponse.status === 429) return tooManyAttempts(upstreamResponse);
    // No WebAuthn relying party on this instance: the sign-in falls back to the password.
    if (upstreamResponse.status === 503) return unavailable();
    if (!upstreamResponse.ok) return bffFailure(upstreamResponse.status, "La connexion par passkey a échoué. Veuillez réessayer.");

    const body = (await upstreamResponse.json().catch(() => undefined)) as { id?: unknown; options?: unknown } | undefined;
    if (typeof body?.id !== "string" || !body.id || typeof body.options !== "object" || body.options === null) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une réponse invalide." }, { status: 502, headers: NO_STORE });
    }
    return NextResponse.json({ id: body.id, options: body.options }, { headers: NO_STORE });
  } catch (error) {
    return bffUnreachable(error);
  }
}
