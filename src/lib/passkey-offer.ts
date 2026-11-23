/**
 * MAIR-811: what the password sign-ins of BFF User answer next to `message` (`passkey_offer`): whether the instance accepts
 * passkeys (`allowed`) and whether the account already has one (`registered`). The Login screen proposes a passkey (F8)
 * only when it is allowed and the account has none. Anything else reads as nothing to propose.
 */
export type PasskeyOffer = { allowed: boolean; registered: boolean };

export function readPasskeyOffer(body: unknown): PasskeyOffer | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const offer = (body as { passkey_offer?: unknown }).passkey_offer;
  if (typeof offer !== "object" || offer === null) return undefined;
  const { allowed, registered } = offer as { allowed?: unknown; registered?: unknown };
  return typeof allowed === "boolean" && typeof registered === "boolean" ? { allowed, registered } : undefined;
}
