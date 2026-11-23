import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl } from "../../../../lib/bff-user";
import { rejectUnsafeAuthRequest } from "../../../../lib/auth-request";
import { bffUnreachable, NO_STORE, tooManyAttempts } from "../../../../lib/bff-refusal";
import { passkeyRefusal, signedInHeaders } from "../../../../lib/passkey-registration";

/** MAIR-811 F8, step 1: the creation challenge of a passkey for the agent who just signed in with a password. */
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request);
  if (rejected) return rejected;
  const session = signedInHeaders(request);
  if ("refused" in session) return session.refused;

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPostUserMePasskeysOptionsUrl()), {
      method: "POST",
      headers: session.headers,
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (upstreamResponse.status === 429) return tooManyAttempts(upstreamResponse);
    if (!upstreamResponse.ok) return passkeyRefusal(upstreamResponse.status, "La création de la passkey a échoué. Veuillez réessayer.");

    const body = (await upstreamResponse.json().catch(() => null)) as { options?: unknown } | null;
    if (typeof body?.options !== "object" || body.options === null) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une réponse invalide." }, { status: 502, headers: NO_STORE });
    }
    return NextResponse.json({ options: body.options }, { headers: NO_STORE });
  } catch (error) {
    return bffUnreachable(error);
  }
}
