import type { LoginTwoFactorView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../../lib/trusted-client-ip";
import { rejectUnsafeAuthRequest } from "../../../../../lib/auth-request";
import { createAuthSessionResponse } from "../../../../../lib/auth-session";
import { readBffCookieSession } from "../../../../../lib/bff-session-cookies";
import { clearTwoFactorToken, TWO_FACTOR_TOKEN_COOKIE } from "../../../../../lib/two-factor-token";
import { bffFailure, bffUnreachable, NO_STORE, refusalPath, tooManyAttempts } from "../../../../../lib/bff-refusal";

type SecondStepBody = { code?: unknown };

// LoginTwoFactorView (bff-user-openapi) : le code fait 1 à 32 caractères.
const CODE_MAX_LENGTH = 32;

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

    if (upstreamResponse.status === 429) return tooManyAttempts(upstreamResponse);

    if (!upstreamResponse.ok) return bffFailure(upstreamResponse.status, "La connexion a échoué. Veuillez réessayer.");

    const cookieSession = readBffCookieSession(upstreamResponse);
    if (!cookieSession?.accessToken || !cookieSession.refreshToken) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une réponse invalide." }, { status: 502, headers: NO_STORE });
    }
    const response = createAuthSessionResponse(cookieSession.accessToken, cookieSession.refreshToken, cookieSession.maxAge);
    clearTwoFactorToken(response);
    return response;
  } catch (error) {
    return bffUnreachable(error);
  }
}
