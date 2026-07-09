export const MAIRIE360_AUTH_JWT_STORAGE_KEY = "mairie360.auth.jwt";

const LEGACY_AUTH_JWT_STORAGE_KEYS = ["mairie360.projects.jwt"];

function normalizeJwtToken(token?: string | null) {
  const normalizedToken = token?.trim();

  return normalizedToken || null;
}

export function formatBearerToken(token: string) {
  return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
}

export function getStoredAuthJwtToken() {
  if (typeof window === "undefined") return null;

  try {
    const token = normalizeJwtToken(window.localStorage.getItem(MAIRIE360_AUTH_JWT_STORAGE_KEY));
    if (token) return token;

    for (const legacyKey of LEGACY_AUTH_JWT_STORAGE_KEYS) {
      const legacyToken = normalizeJwtToken(window.localStorage.getItem(legacyKey));

      if (legacyToken) {
        window.localStorage.setItem(MAIRIE360_AUTH_JWT_STORAGE_KEY, legacyToken);
        return legacyToken;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function storeAuthJwtToken(token: string) {
  if (typeof window === "undefined") return;

  const normalizedToken = normalizeJwtToken(token);

  try {
    if (normalizedToken) {
      window.localStorage.setItem(MAIRIE360_AUTH_JWT_STORAGE_KEY, normalizedToken);
    } else {
      window.localStorage.removeItem(MAIRIE360_AUTH_JWT_STORAGE_KEY);
    }
  } catch {
    // Some browser contexts can deny localStorage access; requests will simply run without the stored JWT.
  }
}

export function clearStoredAuthJwtToken() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(MAIRIE360_AUTH_JWT_STORAGE_KEY);
    LEGACY_AUTH_JWT_STORAGE_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));
  } catch {
    // Ignore storage failures so logout flows do not crash.
  }
}

export function getStoredAuthorizationHeader() {
  const token = getStoredAuthJwtToken();

  return token ? formatBearerToken(token) : null;
}
