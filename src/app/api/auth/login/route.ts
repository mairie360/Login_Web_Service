import type { components, paths } from '@/contracts/bff';
import { NextRequest, NextResponse } from "next/server";

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

type LoginView = components["schemas"]["LoginView"];
type FirstConnectionResponse = Partial<
  paths["/auth/login"]["post"]["responses"][412]["content"]["application/json"]
>;

const BFF_URL =
  (
    process.env.BFF_USER_API_URL ??
    process.env.USER_BFF_URL ??
    "http://localhost:4000"
  ).replace(/\/+$/, "");
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN?.trim();
const ACCESS_TOKEN_MAX_AGE = 24 * 60 * 60;
const PASSWORD_CHANGE_TOKEN_MAX_AGE = 10 * 60;

// Même règle que `z.email()` utilisé par BFF User pour valider LoginView : un email refusé ici
// l'aurait été par le BFF (400), et le front n'envoie jamais de requête hors contrat.
const EMAIL_PATTERN =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

// Les messages de BFF User sont techniques et en anglais (« Invalid login payload »,
// « Upstream service error ») : l'interface affiche ses propres messages selon le statut.
function getErrorMessage(status: number) {
  if (status === 400) {
    return "Les informations saisies sont invalides.";
  }

  if (status === 401) {
    return "Email ou mot de passe incorrect.";
  }

  if (status === 412) {
    return "Votre mot de passe doit être modifié lors de cette première connexion.";
  }

  if (status >= 500) {
    return "Le service de connexion est indisponible. Veuillez réessayer.";
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

function getAuthorizationToken(response: Response) {
  const authorization = response.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1] ?? null;
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

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { message: "L’adresse email n’est pas valide." },
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
      } satisfies LoginView),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const upstreamBody = await readResponseBody(upstreamResponse);

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
        { message: getErrorMessage(upstreamResponse.status) },
        { status: upstreamResponse.status },
      );
    }

    const accessToken =
      getAuthorizationToken(upstreamResponse);

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
      ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
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
