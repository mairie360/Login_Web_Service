import type { PasskeyRenameView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl } from "../../../../lib/bff-user";
import { rejectUnsafeAuthRequest } from "../../../../lib/auth-request";
import { bffUnreachable, NO_STORE } from "../../../../lib/bff-refusal";
import { PASSKEY_LABEL_MAX_LENGTH, passkeyRefusal, signedInHeaders } from "../../../../lib/passkey-registration";

type NameBody = { id?: unknown; label?: unknown };

/** MAIR-811 F8, step 3: the name the agent keeps on the « Passkey enregistrée » screen (the manager by default). */
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request, true);
  if (rejected) return rejected;

  const body = (await request.json().catch(() => null)) as NameBody | null;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }
  const id = body.id;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1 || id > 2147483647) {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label || label.length > PASSKEY_LABEL_MAX_LENGTH) {
    return NextResponse.json({ message: "Donnez un nom à cette passkey (100 caractères au plus).", reason: "label" }, { status: 400, headers: NO_STORE });
  }

  const session = signedInHeaders(request);
  if ("refused" in session) return session.refused;

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPatchUserMePasskeysPasskeyIdUrl(id)), {
      method: "PATCH",
      headers: session.headers,
      body: JSON.stringify({ label } satisfies PasskeyRenameView),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (upstreamResponse.status === 404) {
      return NextResponse.json({ message: "Cette passkey n’existe plus.", reason: "not-found" }, { status: 404, headers: NO_STORE });
    }
    if (!upstreamResponse.ok) return passkeyRefusal(upstreamResponse.status, "Le nom de la passkey n’a pas pu être enregistré.");
    return NextResponse.json({ label }, { headers: NO_STORE });
  } catch (error) {
    return bffUnreachable(error);
  }
}
