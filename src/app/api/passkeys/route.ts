import type { PasskeyRegisterView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl } from "../../../lib/bff-user";
import { rejectUnsafeAuthRequest } from "../../../lib/auth-request";
import { bffUnreachable, NO_STORE, tooManyAttempts } from "../../../lib/bff-refusal";
import { PASSKEY_LABEL_MAX_LENGTH, passkeyRefusal, signedInHeaders } from "../../../lib/passkey-registration";

type RegisterBody = { label?: unknown; credential?: unknown };

/**
 * MAIR-811 F8, step 2: the browser answer goes to BFF User with a provisional name. The answer gives the id of the passkey
 * and the name of its manager (`provider`), which the « Passkey enregistrée » screen proposes as its name.
 */
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request, true);
  if (rejected) return rejected;

  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label || label.length > PASSKEY_LABEL_MAX_LENGTH || typeof body.credential !== "object" || body.credential === null || Array.isArray(body.credential)) {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }

  const session = signedInHeaders(request);
  if ("refused" in session) return session.refused;

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPostUserMePasskeysUrl()), {
      method: "POST",
      headers: session.headers,
      body: JSON.stringify({ label, credential: body.credential as PasskeyRegisterView["credential"] } satisfies PasskeyRegisterView),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (upstreamResponse.status === 400) {
      return NextResponse.json({ message: "La passkey n’a pas pu être vérifiée.", reason: "refused" }, { status: 400, headers: NO_STORE });
    }
    if (upstreamResponse.status === 429) return tooManyAttempts(upstreamResponse);
    if (!upstreamResponse.ok) return passkeyRefusal(upstreamResponse.status, "La création de la passkey a échoué. Veuillez réessayer.");

    const stored = (await upstreamResponse.json().catch(() => null)) as { id?: unknown; label?: unknown; provider?: unknown } | null;
    if (typeof stored?.id !== "number" || typeof stored.label !== "string") {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une réponse invalide." }, { status: 502, headers: NO_STORE });
    }
    const provider = typeof stored.provider === "string" && stored.provider.trim() ? stored.provider.trim() : null;
    return NextResponse.json({ id: stored.id, label: stored.label, provider }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return bffUnreachable(error);
  }
}
