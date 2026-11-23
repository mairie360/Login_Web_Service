import { NextRequest, NextResponse } from "next/server";
import { configuredBffUrl } from "./bff-user";
import { NO_STORE } from "./bff-refusal";
import { trustedClientIpHeaders } from "./trusted-client-ip";

/** Longest passkey name BFF User accepts (`PasskeyRegisterView.label`, `PasskeyRenameView.label`). */
export const PASSKEY_LABEL_MAX_LENGTH = 100;

/**
 * MAIR-811: the passkey routes of a signed-in agent (F8) send the session the Login just opened, read from the `accessToken`
 * cookie, as the Bearer header BFF User expects. Without a session, or without a configured BFF, nothing is called.
 */
export function signedInHeaders(request: NextRequest): { headers: Record<string, string> } | { refused: NextResponse } {
  const accessToken = request.cookies.get("accessToken")?.value ?? "";
  if (!accessToken) {
    return { refused: NextResponse.json({ message: "Votre session a expiré.", reason: "session" }, { status: 401, headers: NO_STORE }) };
  }
  if (!configuredBffUrl()) {
    return { refused: NextResponse.json({ message: "Le service de connexion n’est pas configuré." }, { status: 503, headers: NO_STORE }) };
  }
  return {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...trustedClientIpHeaders(request),
    },
  };
}

/** The French answer to a refusal of BFF User on the passkey routes of a signed-in agent. */
export function passkeyRefusal(status: number, fallback: string) {
  if (status === 401) return NextResponse.json({ message: "Votre session a expiré.", reason: "session" }, { status, headers: NO_STORE });
  if (status === 403) return NextResponse.json({ message: "Votre mairie n’accepte pas les passkeys.", reason: "not-accepted" }, { status, headers: NO_STORE });
  if (status === 409) return NextResponse.json({ message: "Cette passkey est déjà enregistrée.", reason: "already-registered" }, { status, headers: NO_STORE });
  if (status === 503) return NextResponse.json({ message: "La création de passkey est indisponible pour le moment.", reason: "unavailable" }, { status, headers: NO_STORE });
  return NextResponse.json({ message: status >= 500 ? "Le service de connexion est indisponible. Veuillez réessayer." : fallback }, { status, headers: NO_STORE });
}
