import { getStoredAuthorizationHeader, storeAuthJwtToken } from "./auth-token";

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthTokenResponse =
  | string
  | {
      token?: string;
      accessToken?: string;
      access_token?: string;
      jwt?: string;
      idToken?: string;
      id_token?: string;
      data?: unknown;
      auth?: unknown;
      result?: unknown;
      [key: string]: unknown;
    };

type ApiErrorBody = {
  message?: string;
  error?:
    | {
        code?: string;
        message?: string;
        details?: unknown[];
      }
    | string
    | unknown;
};

export class BffUserError extends Error {
  status: number;
  code?: string;
  details?: unknown[];

  constructor(message: string, status: number, code?: string, details?: unknown[]) {
    super(message);
    this.name = "BffUserError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isStructuredError(
  error: ApiErrorBody["error"]
): error is { code?: string; message?: string; details?: unknown[] } {
  return Boolean(error && typeof error === "object" && !Array.isArray(error));
}

function normalizeJwtToken(token?: string | null) {
  const normalizedToken = token?.trim();

  return normalizedToken || null;
}

function getStringField(value: Record<string, unknown>, field: string) {
  const fieldValue = value[field];

  return typeof fieldValue === "string" ? normalizeJwtToken(fieldValue) : null;
}

export function getJwtTokenFromAuthResponse(response: unknown): string | null {
  if (typeof response === "string") return normalizeJwtToken(response);
  if (!response || typeof response !== "object" || Array.isArray(response)) return null;

  const responseObject = response as Record<string, unknown>;
  const directToken =
    getStringField(responseObject, "token") ??
    getStringField(responseObject, "accessToken") ??
    getStringField(responseObject, "access_token") ??
    getStringField(responseObject, "jwt") ??
    getStringField(responseObject, "idToken") ??
    getStringField(responseObject, "id_token");

  if (directToken) return directToken;

  return (
    getJwtTokenFromAuthResponse(responseObject.data) ??
    getJwtTokenFromAuthResponse(responseObject.auth) ??
    getJwtTokenFromAuthResponse(responseObject.result)
  );
}

function createRequestHeaders(init: RequestInit) {
  const headers = new Headers(init.headers);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Authorization")) {
    const authorizationHeader = getStoredAuthorizationHeader();

    if (authorizationHeader) {
      headers.set("Authorization", authorizationHeader);
    }
  }

  return headers;
}

async function parseResponseError(response: Response): Promise<never> {
  let errorBody: ApiErrorBody | null = null;

  try {
    errorBody = (await response.json()) as ApiErrorBody;
  } catch {
    errorBody = null;
  }

  const structuredError = isStructuredError(errorBody?.error)
    ? errorBody.error
    : null;
  const fallbackError =
    typeof errorBody?.error === "string" ? errorBody.error : undefined;

  throw new BffUserError(
    structuredError?.message ??
      fallbackError ??
      errorBody?.message ??
      `Erreur BFF (${response.status})`,
    response.status,
    structuredError?.code,
    structuredError?.details
  );
}

async function requestBff<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api/bff${path}`, {
    ...init,
    credentials: "same-origin",
    headers: createRequestHeaders(init),
  });

  if (!response.ok) {
    await parseResponseError(response);
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

export function getBffUserErrorMessage(error: unknown) {
  if (error instanceof BffUserError) return error.message;
  if (error instanceof Error) return error.message;

  return "Une erreur inconnue est survenue.";
}

export async function login(body: LoginRequest) {
  const response = await requestBff<AuthTokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const jwtToken = getJwtTokenFromAuthResponse(response);

  if (!jwtToken) {
    throw new Error("La réponse de connexion ne contient pas de token JWT.");
  }

  storeAuthJwtToken(jwtToken);

  return response;
}
