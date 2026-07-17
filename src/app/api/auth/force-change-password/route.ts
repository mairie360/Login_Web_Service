import { NextRequest, NextResponse } from "next/server";

type ForceChangePasswordBody = {
  newPassword?: unknown;
};

type UpstreamError = {
  message?: unknown;
};

const BFF_URL = (
  process.env.BFF_USER_API_URL ??
  process.env.USER_BFF_URL ??
  "http://localhost:4000"
).replace(/\/+$/, "");

function clearPasswordChangeToken(response: NextResponse) {
  response.cookies.set("passwordChangeToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 0,
  });
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(status: number, body: unknown) {
  if (typeof body === "object" && body !== null) {
    const { message } = body as UpstreamError;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (status === 400) {
    return "Le nouveau mot de passe est invalide.";
  }

  if (status === 401 || status === 403) {
    return "Le lien de changement de mot de passe est invalide ou expiré.";
  }

  if (status === 404) {
    return "Le BFF ne trouve pas la route de changement de mot de passe du Core API.";
  }

  return "Le mot de passe n’a pas pu être modifié.";
}

export async function POST(request: NextRequest) {
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

  try {
    const upstreamResponse = await fetch(
      `${BFF_URL}/auth/force_change_password`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_password: newPassword,
          token,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    const upstreamBody = await readResponseBody(upstreamResponse);

    if (!upstreamResponse.ok) {
      const shouldRestartLogin =
        upstreamResponse.status === 401 || upstreamResponse.status === 403;
      const isCoreRouteMismatch = upstreamResponse.status === 404;
      const response = NextResponse.json(
        {
          message: getErrorMessage(upstreamResponse.status, upstreamBody),
          ...(isCoreRouteMismatch
            ? { errorCode: "CORE_FORCE_CHANGE_ROUTE_NOT_FOUND" }
            : {}),
          ...(shouldRestartLogin ? { restartLogin: true } : {}),
        },
        { status: isCoreRouteMismatch ? 502 : upstreamResponse.status },
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
