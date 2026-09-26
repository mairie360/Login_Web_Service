// Unique BFF appelé par ce front : BFF User. Toute requête serveur vers un BFF passe par bffUserUrl,
// résolu à chaque requête (tests/network-calls.test.cjs l'impose).
export function configuredBffUrl() {
  const value = (process.env.BFF_USER_API_URL ?? process.env.USER_BFF_URL)?.trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return '';
    return value.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/** URL absolue d'une route de BFF User ; `path` doit être une opération de contracts/openapi.json. */
export function bffUserUrl(path: string) {
  const baseUrl = configuredBffUrl();
  return baseUrl ? `${baseUrl}${path}` : '';
}
