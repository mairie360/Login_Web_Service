import contract from '../../contracts/openapi.json';

/** The four probes and current-user reads every other front relies on, relayed as they are. */
const RELAYED_EXACT = ['/me', '/session/me', '/health', '/check_apis'];

/**
 * MAIR-700: the only BFF User routes this front relays. The sign-in, recovery and two-factor routes of the Login
 * screens (`/auth/*`, the retired `/auth/keycloak` excepted), the current user (`/me`, `/session/me`, read by
 * Projects and Settings through this relay), the passkey creation of the Login screen and the probes. Everything
 * else of the contract, `/admin/*` above all, answers 404 here: the administration routes are reached through the
 * administration console only.
 */
export function isRelayedPath(template: string) {
  if (template === '/auth/keycloak') return false;
  return template.startsWith('/auth/') || template === '/user/me/passkeys' || template === '/user/me/passkeys/options' || RELAYED_EXACT.includes(template);
}

/** The published paths the catch-all relays: the contract filtered by `isRelayedPath`. */
export const relayedPaths = Object.fromEntries(Object.entries(contract.paths).filter(([template]) => isRelayedPath(template))) as Partial<typeof contract.paths>;
