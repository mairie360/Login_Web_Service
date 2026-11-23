import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl } from "../../../../lib/bff-user";
import { rejectUnsafeAuthRequest } from "../../../../lib/auth-request";
import { bffUnreachable, NO_STORE } from "../../../../lib/bff-refusal";
import { signedInHeaders } from "../../../../lib/passkey-registration";

type AcknowledgeBody = { id?: unknown };

/** MAIR-773 F9: « J'ai compris » / « C'était moi » marks the alert read, so the next sign-in no longer shows it. */
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request, true);
  if (rejected) return rejected;

  const body = (await request.json().catch(() => null)) as AcknowledgeBody | null;
  const id = typeof body === "object" && body !== null ? body.id : undefined;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1 || id > Number.MAX_SAFE_INTEGER) {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }

  const session = signedInHeaders(request);
  if ("refused" in session) return session.refused;

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPostUserMeSecurityAlertAlertIdAcknowledgeUrl(id)), {
      method: "POST",
      headers: session.headers,
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    // Already read (another tab) or gone: nothing left to show.
    if (upstreamResponse.status === 204 || upstreamResponse.status === 404) {
      return new NextResponse(null, { status: 204, headers: NO_STORE });
    }
    if (upstreamResponse.status === 401) {
      return NextResponse.json({ message: "Votre session a expiré.", reason: "session" }, { status: 401, headers: NO_STORE });
    }
    return NextResponse.json({ message: "Le service de connexion est indisponible. Veuillez réessayer." }, { status: 502, headers: NO_STORE });
  } catch (error) {
    return bffUnreachable(error);
  }
}
