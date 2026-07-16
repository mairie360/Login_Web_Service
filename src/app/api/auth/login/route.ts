import { NextRequest, NextResponse } from "next/server";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

type UpstreamError = {
  message?: unknown;
  error?: unknown;
};

type FirstConnectionResponse = {
  token?: unknown;
};

const BFF_URL = process.env.BFF_USER_API_URL ?? "http://localhost:4000";
const ACCESS_TOKEN_MAX_AGE = 24 * 60 * 60;
const PASSWORD_CHANGE_TOKEN_MAX_AGE = 10 * 60;

function getErrorMessage(status: number, body: unknown) {
  if (typeof body === "object" && body !== null) {
    const { message } = body as UpstreamError;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (status === 400) {
    return "Les informations saisies sont invalides.";
  }

  if (status === 401) {
    return "Email ou mot de passe incorrect.";
  }

  if (status === 412) {
    return "Votre mot de passe doit être modifié lors de cette première connexion.";
  }

  return "La connexion a échoué. Veuillez réessayer.";
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

function getRefreshToken(body: unknown) {
  if (
    typeof body === "object" &&
    body !== null &&
    "refresh_token" in body &&
    typeof body.refresh_token === "string"
  ) {
    return body.refresh_token;
  }

  return null;
}

function getAuthorizationToken(response: Response) {
  const authorization = response.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1] ?? null;
}

function maskToken(token: string | null) {
  if (!token) {
    return "absent";
  }

  if (token.length <= 16) {
    return "présent";
  }

  return `${token.slice(0, 8)}…${token.slice(-8)}`;
}

function getResponseKeys(body: unknown) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return [];
  }

  return Object.keys(body);
}

function getPasswordChangeToken(body: unknown) {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const { token } = body as FirstConnectionResponse;

  return typeof token === "string" && token ? token : null;
}

export async function POST(request: NextRequest) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { message: "La requête de connexion est invalide." },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { message: "L’email et le mot de passe sont obligatoires." },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetch(`${BFF_URL}/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        device_info: request.headers.get("user-agent") ?? "Navigateur inconnu",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const upstreamBody = await readResponseBody(upstreamResponse);
    const authorizationHeader = upstreamResponse.headers.get("authorization");

    if (upstreamResponse.status === 412) {
      const passwordChangeToken = getPasswordChangeToken(upstreamBody);

      if (passwordChangeToken) {
        const response = NextResponse.json({
          requiresPasswordChange: true,
          message: "Vous devez choisir un nouveau mot de passe.",
        });

        response.cookies.set("passwordChangeToken", passwordChangeToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/api/auth",
          maxAge: PASSWORD_CHANGE_TOKEN_MAX_AGE,
        });

        return response;
      }
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { message: getErrorMessage(upstreamResponse.status, upstreamBody) },
        { status: upstreamResponse.status },
      );
    }

    const accessToken =
      getAuthorizationToken(upstreamResponse) ?? getRefreshToken(upstreamBody);

    if (!accessToken) {
      return NextResponse.json(
        { message: "Le service de connexion a renvoyé une réponse invalide." },
        { status: 502 },
      );
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    return response;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";

    return NextResponse.json(
      {
        message: timedOut
          ? "Le service de connexion met trop de temps à répondre."
          : "Le service de connexion est indisponible.",
      },
      { status: timedOut ? 504 : 502 },
    );
  }
}
