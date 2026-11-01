import type { ResetPasswordView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { rejectUnsafeAuthRequest } from "../../../../lib/auth-request";
import { createAuthSessionResponse } from "../../../../lib/auth-session";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../lib/bff-user";
import { readBffCookieSession } from "../../../../lib/bff-session-cookies";
import { RESET_TOKEN_PATTERN, RESET_EXPIRED_MESSAGE } from "../../../../lib/password-recovery-validation";
import { trustedClientIpHeaders } from "../../../../lib/trusted-client-ip";

const reply = (message: string, status: number) => NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request, true);
  if (rejected) return rejected;
  let body: unknown;
  try { body = await request.json(); } catch { return reply("La requête est invalide.", 400); }
  const token = typeof body === "object" && body !== null && "token" in body && typeof body.token === "string" ? body.token : "";
  const newPassword = typeof body === "object" && body !== null && "newPassword" in body && typeof body.newPassword === "string" ? body.newPassword : "";
  if (!RESET_TOKEN_PATTERN.test(token)) return reply(RESET_EXPIRED_MESSAGE, 400);
  if (newPassword.length < 8 || newPassword.length > 255) return reply("Le mot de passe doit contenir entre 8 et 255 caractères.", 400);
  if (!configuredBffUrl() || (process.env.NODE_ENV === "production" && !process.env.COOKIE_DOMAIN?.trim())) return reply("Le service de récupération est indisponible.", 503);
  try {
    const upstream = await fetch(bffUserUrl(bffUserOperations.getPostAuthResetPasswordUrl()), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...trustedClientIpHeaders(request) },
      body: JSON.stringify({ token, new_password: newPassword, device_info: (request.headers.get("user-agent") || "Navigateur inconnu").slice(0, 512) } satisfies ResetPasswordView),
      cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) return reply(upstream.status === 401 || upstream.status === 403 ? RESET_EXPIRED_MESSAGE : upstream.status === 429 ? "Trop de demandes. Veuillez réessayer plus tard." : "Le mot de passe n’a pas pu être modifié. Veuillez réessayer.", upstream.status);
    const session = readBffCookieSession(upstream);
    let result: unknown;
    try { result = await upstream.json(); } catch { return reply("Le service a renvoyé une réponse invalide.", 502); }
    if (!session || typeof result !== "object" || result === null || !("message" in result) || typeof result.message !== "string") return reply("Le service a renvoyé une réponse invalide.", 502);
    return createAuthSessionResponse(session.accessToken, session.refreshToken, session.maxAge);
  } catch (error) {
    return reply("Le service de récupération est indisponible. Veuillez réessayer.", error instanceof Error && error.name === "TimeoutError" ? 504 : 502);
  }
}
