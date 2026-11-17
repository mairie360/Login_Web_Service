import type { ForceChangePasswordView } from '@mairie360/bff-user-openapi/model';
import { NextRequest, NextResponse } from "next/server";
import { bffUserOperations, bffUserUrl, configuredBffUrl } from "../../../../lib/bff-user";
import { trustedClientIpHeaders } from "../../../../lib/trusted-client-ip";
import { rejectUnsafeAuthRequest } from "../../../../lib/auth-request";
import { PASSWORD_POLICY_MESSAGE } from "../../../../lib/password-recovery-validation";

type ForceChangePasswordBody = {
  newPassword?: unknown;
};

function clearPasswordChangeToken(response: NextResponse) {
  response.cookies.set("passwordChangeToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 0,
  });
}

// BFF User messages are technical and in English: the interface shows its own message per status. A 400 is a password
// Core API's policy refused (MAIR-757), without saying which rule, so the whole policy is shown.
function getErrorMessage(status: number) {
  if (status === 400) {
    return PASSWORD_POLICY_MESSAGE;
  }

  if (status === 401 || status === 403) {
    return "Le lien de changement de mot de passe est invalide ou expiré. Reconnectez-vous.";
  }

  if (status >= 500) {
    return "Le service de changement de mot de passe est indisponible. Veuillez réessayer.";
  }

  return "Le mot de passe n’a pas pu être modifié.";
}

export async function POST(request: NextRequest) {
  const rejected = rejectUnsafeAuthRequest(request, true);
  if (rejected) return rejected;

  let body: ForceChangePasswordBody;

  try {
    body = (await request.json()) as ForceChangePasswordBody;
  } catch {
    return NextResponse.json(
      { message: "La requête est invalide." },
      { status: 400 },
    );
  }

  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";
  const token = request.cookies.get("passwordChangeToken")?.value ?? "";

  if (!newPassword || !token) {
    return NextResponse.json(
      {
        message: "Votre session de changement de mot de passe a expiré.",
        restartLogin: true,
      },
      { status: 400 },
    );
  }

  if (!configuredBffUrl()) {
    return NextResponse.json(
      { message: "Le service de changement de mot de passe n’est pas configuré." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const upstreamResponse = await fetch(
      bffUserUrl(bffUserOperations.getPostAuthForceChangePasswordUrl()),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...trustedClientIpHeaders(request),
        },
        body: JSON.stringify({
          new_password: newPassword,
          token,
        } satisfies ForceChangePasswordView),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!upstreamResponse.ok) {
      // 401 : jeton refusé par Core API ; 403 : jeton de première connexion inconnu ou expiré côté BFF.
      const shouldRestartLogin =
        upstreamResponse.status === 401 || upstreamResponse.status === 403;
      const response = NextResponse.json(
        {
          message: getErrorMessage(upstreamResponse.status),
          ...(shouldRestartLogin ? { restartLogin: true } : {}),
        },
        { status: upstreamResponse.status },
      );

      if (shouldRestartLogin) {
        clearPasswordChangeToken(response);
      }

      return response;
    }

    const response = NextResponse.json({ success: true });

    clearPasswordChangeToken(response);

    return response;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";

    return NextResponse.json(
      {
        message: timedOut
          ? "Le service met trop de temps à répondre."
          : "Le service de changement de mot de passe est indisponible.",
      },
      { status: timedOut ? 504 : 502 },
    );
  }
}
