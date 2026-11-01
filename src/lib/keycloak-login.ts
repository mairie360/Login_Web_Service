import { createHash, randomBytes } from "node:crypto";
import { parseFrontUrl } from "./front-url";

/**
 * Keycloak single sign-on (MAIR-153): OpenID Connect authorization code flow with PKCE.
 *
 * The browser goes to Keycloak and comes back to `/api/auth/keycloak/callback` with a code. Core API
 * redeems it (through BFF User `POST /auth/keycloak`) with its own confidential client, so the
 * authorization request uses Core's client id. The state, nonce and PKCE verifier stay in an HttpOnly
 * cookie scoped to the Keycloak routes for the duration of the round trip.
 */
export const KEYCLOAK_LOGIN_COOKIE = "keycloakLogin";
export const KEYCLOAK_LOGIN_COOKIE_PATH = "/api/auth/keycloak";
export const KEYCLOAK_LOGIN_MAX_AGE = 10 * 60;
export const KEYCLOAK_CALLBACK_PATH = "/api/auth/keycloak/callback";

export type KeycloakSettings = { realmUrl: string; clientId: string; redirectUri: string };
export type KeycloakLoginState = { state: string; nonce: string; verifier: string; redirect: string };

export const KEYCLOAK_ERRORS = {
  cancelled: "La connexion avec le compte unique a été annulée.",
  expired: "La connexion avec le compte unique a expiré ou a été interrompue. Veuillez réessayer.",
  account: "Aucun compte Mairie360 actif n’est associé à ce compte unique. Contactez votre administrateur.",
  busy: "Trop de tentatives de connexion. Veuillez patienter avant de réessayer.",
  unconfigured: "La connexion avec le compte unique n’est pas disponible. Utilisez votre email et votre mot de passe.",
  unavailable: "Le service de connexion est indisponible. Veuillez réessayer.",
} as const;
export type KeycloakLoginError = keyof typeof KEYCLOAK_ERRORS;

const CLIENT_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** `KEYCLOAK_REALM_URL` (public realm URL), `KEYCLOAK_CLIENT_ID` and `LOGIN_FRONT_URL`, or null when one is missing. */
export function keycloakSettings(): KeycloakSettings | null {
  const realm = parseFrontUrl(process.env.KEYCLOAK_REALM_URL);
  const clientId = process.env.KEYCLOAK_CLIENT_ID?.trim() ?? "";
  const login = parseFrontUrl(process.env.LOGIN_FRONT_URL);
  if (!realm || realm.search || realm.hash || !CLIENT_ID_PATTERN.test(clientId) || !login) return null;
  return {
    realmUrl: realm.href.replace(/\/+$/, ""),
    clientId,
    redirectUri: new URL(KEYCLOAK_CALLBACK_PATH, login.origin).href,
  };
}

const randomToken = () => randomBytes(32).toString("base64url");

/** Authorization URL of the realm and the cookie value that the callback checks it against. */
export function startKeycloakLogin(settings: KeycloakSettings, redirect: string) {
  const login: KeycloakLoginState = { state: randomToken(), nonce: randomToken(), verifier: randomToken(), redirect };
  const url = new URL(`${settings.realmUrl}/protocol/openid-connect/auth`);
  url.search = new URLSearchParams({
    client_id: settings.clientId,
    response_type: "code",
    scope: "openid email",
    redirect_uri: settings.redirectUri,
    state: login.state,
    nonce: login.nonce,
    code_challenge: createHash("sha256").update(login.verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  return { authorizationUrl: url.href, cookie: Buffer.from(JSON.stringify(login)).toString("base64url") };
}

export function readKeycloakLoginState(value: string | undefined): KeycloakLoginState | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null) return null;
    const { state, nonce, verifier, redirect } = parsed as Record<string, unknown>;
    if (![state, nonce, verifier].every(token => typeof token === "string" && TOKEN_PATTERN.test(token)) || typeof redirect !== "string") return null;
    return { state, nonce, verifier, redirect } as KeycloakLoginState;
  } catch {
    return null;
  }
}

export function isKeycloakLoginError(value: unknown): value is KeycloakLoginError {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(KEYCLOAK_ERRORS, value);
}

/** Sign-in page showing `error`, keeping the requested module. A relative URL: the ingress host is not trusted. */
export function loginPageUrl(error: KeycloakLoginError, redirect?: string) {
  const query = new URLSearchParams({ keycloakError: error });
  if (redirect) query.set("redirect", redirect);
  return `/?${query}`;
}
