export const NONCE_REQUEST_HEADER = "x-nonce";

// Politique appliquée par le middleware à chaque page. Les scripts sont limités au
// nonce de la requête ('strict-dynamic' propage la confiance aux chunks chargés par
// Next.js). Les feuilles de style sont limitées à l'origine et au nonce ; seuls les
// attributs style (posés par les composants de @mairie360/lib-components) gardent
// 'unsafe-inline' via style-src-attr.
export function buildContentSecurityPolicy(nonce: string, isDevelopment = false) {
  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];

  // Le rafraîchissement à chaud de `next dev` évalue du code à la volée.
  if (isDevelopment) scriptSources.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function createNonce() {
  return btoa(crypto.randomUUID());
}
