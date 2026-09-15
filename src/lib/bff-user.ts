// Unique BFF appelé par ce front : BFF User. Toute requête serveur vers un BFF passe par bffUserUrl,
// résolu à chaque requête (tests/network-calls.test.cjs l'impose).
export function configuredBffUrl() {
  return (process.env.BFF_USER_API_URL ??
    process.env.USER_BFF_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
}

/** URL absolue d'une route de BFF User ; `path` doit être une opération de contracts/openapi.json. */
export function bffUserUrl(path: string) {
  return `${configuredBffUrl()}${path}`;
}
