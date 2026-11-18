import type { LoginTwoFactorView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../../lib/trusted-client-ip";
import { rejectUnsafeAuthRequest } from "../../../../../lib/auth-request";
import { createAuthSessionResponse } from "../../../../../lib/auth-session";
import { readBffCookieSession } from "../../../../../lib/bff-session-cookies";
import { clearTwoFactorToken, TWO_FACTOR_TOKEN_COOKIE } from "../../../../../lib/two-factor-token";

type SecondStepBody = { code?: unknown };

// LoginTwoFactorView (bff-user-openapi) : le code fait 1 à 32 caractères.
const CODE_MAX_LENGTH = 32;
const NO_STORE = { "Cache-Control": "no-store" };

type BffRefusal = { error?: { details?: { path?: unknown }[] } };

/** Le BFF distingue, par `error.details[0].path`, le code de secours déjà utilisé et la session de connexion terminée. */
async function refusalPath(response: Response): Promise<string | undefined> {
  try {
    const path = ((await response.json()) as BffRefusal).error?.details?.[0]?.path;
    return typeof path === "string" ? path : undefined;
  } catch {
    return undefined;
  }
}

function sessionOver() {
  const response = NextResponse.json(
    { message: "Votre session de connexion a expiré.", restartLogin: true },
    { status: 401, headers: NO_STORE },
  );
  clearTwoFactorToken(response);
  return response;
}

// Les messages du BFF sont techniques et en anglais : l'interface affiche ses propres messages selon le cas.
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request, true);
  if (rejected) return rejected;

  let body: SecondStepBody;
  try {
    body = (await request.json()) as SecondStepBody;
  } catch {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code || code.length > CODE_MAX_LENGTH) {
    return NextResponse.json({ message: "Saisissez le code à 6 chiffres." }, { status: 400, headers: NO_STORE });
  }

  const token = request.cookies.get(TWO_FACTOR_TOKEN_COOKIE)?.value ?? "";
  if (!token) return sessionOver();

  if (!configuredBffUrl()) {
    return NextResponse.json({ message: "Le service de connexion n’est pas configuré." }, { status: 503, headers: NO_STORE });
  }

  const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
  if (process.env.NODE_ENV === "production" && !cookieDomain) {
    return NextResponse.json({ message: "La session partagée n’est pas configurée." }, { status: 503, headers: NO_STORE });
  }

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPostAuthLogin2faUrl()), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...trustedClientIpHeaders(request) },
      body: JSON.stringify({ token, code } satisfies LoginTwoFactorView),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (upstreamResponse.status === 401) {
      const path = await refusalPath(upstreamResponse);
      if (path === "body.token") return sessionOver();
      return NextResponse.json(
        path === "body.code" ? { message: "Ce code de secours a déjà été utilisé.", reason: "spent-backup-code" } : { message: "Code incorrect.", reason: "wrong-code" },
        { status: 401, headers: NO_STORE },
      );
    }

    if (upstreamResponse.status === 429) {
      const retryAfter = Number.parseInt(upstreamResponse.headers.get("retry-after") ?? "", 10);
      return NextResponse.json(
        { message: "Trop de tentatives.", ...(Number.isFinite(retryAfter) && retryAfter > 0 ? { retryAfter } : {}) },
        { status: 429, headers: { ...NO_STORE, ...(Number.isFinite(retryAfter) && retryAfter > 0 ? { "Retry-After": String(retryAfter) } : {}) } },
      );
    }

    if (!upstreamResponse.ok) {
      const unavailable = upstreamResponse.status >= 500;
      return NextResponse.json(
        { message: unavailable ? "Le service de connexion est indisponible. Veuillez réessayer." : "La connexion a échoué. Veuillez réessayer." },
        { status: upstreamResponse.status, headers: NO_STORE },
      );
    }

    const cookieSession = readBffCookieSession(upstreamResponse);
    if (!cookieSession?.accessToken || !cookieSession.refreshToken) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une réponse invalide." }, { status: 502, headers: NO_STORE });
    }
    const response = createAuthSessionResponse(cookieSession.accessToken, cookieSession.refreshToken, cookieSession.maxAge);
    clearTwoFactorToken(response);
    return response;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { message: timedOut ? "Le service de connexion met trop de temps à répondre." : "Le service de connexion est indisponible." },
      { status: timedOut ? 504 : 502, headers: NO_STORE },
    );
  }
}
