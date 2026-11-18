import type { TwoFactorSetupConfirmView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../../lib/trusted-client-ip";
import { rejectUnsafeAuthRequest } from "../../../../../lib/auth-request";
import { setAuthSessionCookies } from "../../../../../lib/auth-session";
import { readBffCookieSession } from "../../../../../lib/bff-session-cookies";
import { clearTwoFactorSetupToken, TWO_FACTOR_SETUP_TOKEN_COOKIE } from "../../../../../lib/two-factor-token";
import { bffFailure, bffUnreachable, NO_STORE, refusalPath, tooManyAttempts } from "../../../../../lib/bff-refusal";

type ConfirmBody = { code?: unknown };

// TwoFactorSetupConfirmView (bff-user-openapi): the code is 1 to 32 characters.
const CODE_MAX_LENGTH = 32;

function enrolmentOver() {
  const response = NextResponse.json(
    { message: "Votre session de connexion a expiré.", restartLogin: true },
    { status: 401, headers: NO_STORE },
  );
  clearTwoFactorSetupToken(response);
  return response;
}

// Confirms the enrolment with the first code of the application: the session opens like a sign-in and the ten backup codes
// come back once, in the body, for the screen that makes the agent keep them.
export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request, true);
  if (rejected) return rejected;

  let body: ConfirmBody;
  try {
    body = (await request.json()) as ConfirmBody;
  } catch {
    return NextResponse.json({ message: "La requête est invalide." }, { status: 400, headers: NO_STORE });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code || code.length > CODE_MAX_LENGTH) {
    return NextResponse.json({ message: "Saisissez le code à 6 chiffres." }, { status: 400, headers: NO_STORE });
  }

  const token = request.cookies.get(TWO_FACTOR_SETUP_TOKEN_COOKIE)?.value ?? "";
  if (!token) return enrolmentOver();

  if (!configuredBffUrl()) {
    return NextResponse.json({ message: "Le service de connexion n’est pas configuré." }, { status: 503, headers: NO_STORE });
  }

  const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
  if (process.env.NODE_ENV === "production" && !cookieDomain) {
    return NextResponse.json({ message: "La session partagée n’est pas configurée." }, { status: 503, headers: NO_STORE });
  }

  try {
    const upstreamResponse = await fetch(bffUserUrl(bffUserOperations.getPostAuth2faConfirmUrl()), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", ...trustedClientIpHeaders(request) },
      body: JSON.stringify({ token, code } satisfies TwoFactorSetupConfirmView),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (upstreamResponse.status === 401) {
      // A wrong first code keeps the enrolment token usable; a token that is over sends the agent back to the password.
      return (await refusalPath(upstreamResponse)) === "body.token"
        ? enrolmentOver()
        : NextResponse.json({ message: "Code incorrect.", reason: "wrong-code" }, { status: 401, headers: NO_STORE });
    }
    // The setup was never called for this token: the enrolment has to start again from the password.
    if (upstreamResponse.status === 404) return enrolmentOver();
    if (upstreamResponse.status === 429) return tooManyAttempts(upstreamResponse);
    if (!upstreamResponse.ok) return bffFailure(upstreamResponse.status, "La connexion a échoué. Veuillez réessayer.");

    const cookieSession = readBffCookieSession(upstreamResponse);
    const result = (await upstreamResponse.json().catch(() => null)) as { backup_codes?: unknown } | null;
    const backupCodes = Array.isArray(result?.backup_codes) && result.backup_codes.every((item) => typeof item === "string") ? (result.backup_codes as string[]) : null;
    if (!cookieSession?.accessToken || !cookieSession.refreshToken || !backupCodes) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une réponse invalide." }, { status: 502, headers: NO_STORE });
    }

    const response = NextResponse.json({ success: true, backupCodes }, { headers: NO_STORE });
    if (!setAuthSessionCookies(response, cookieSession.accessToken, cookieSession.refreshToken, cookieSession.maxAge)) {
      return NextResponse.json({ message: "Le service de connexion a renvoyé une session expirée." }, { status: 502, headers: NO_STORE });
    }
    clearTwoFactorSetupToken(response);
    return response;
  } catch (error) {
    return bffUnreachable(error);
  }
}
