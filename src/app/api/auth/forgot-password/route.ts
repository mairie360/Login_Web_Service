import type { ForgotPasswordView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { rejectUnsafeAuthRequest } from "../../../../lib/auth-request";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../lib/trusted-client-ip";
import { RECOVERY_EMAIL_PATTERN, RECOVERY_SENT_MESSAGE } from "../../../../lib/password-recovery-validation";

const reply = (message: string, status: number) => NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request, true);
  if (rejected) return rejected;
  let body: unknown;
  try { body = await request.json(); } catch { return reply("La requête est invalide.", 400); }
  const email = typeof body === "object" && body !== null && "email" in body && typeof body.email === "string" ? body.email.trim() : "";
  if (email.length > 320 || !RECOVERY_EMAIL_PATTERN.test(email)) return reply("L’adresse email n’est pas valide.", 400);
  if (!configuredBffUrl()) return reply("Le service de récupération est indisponible.", 503);
  try {
    const upstream = await fetch(bffUserUrl(bffUserOperations.getPostAuthForgotPasswordUrl()), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...trustedClientIpHeaders(request) },
      body: JSON.stringify({ email } satisfies ForgotPasswordView), cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) return reply(upstream.status === 429 ? "Trop de demandes. Veuillez réessayer plus tard." : "La demande n’a pas pu être envoyée. Veuillez réessayer.", upstream.status);
    // The published success is empty and identical for existing and unknown accounts.
    return NextResponse.json({ success: true, message: RECOVERY_SENT_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return reply("Le service de récupération est indisponible. Veuillez réessayer.", error instanceof Error && error.name === "TimeoutError" ? 504 : 502);
  }
}
