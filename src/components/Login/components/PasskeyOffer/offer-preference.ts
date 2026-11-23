import { isWebAuthnSupported } from "../PasskeySignIn";

/** What the password sign-ins answer about passkeys (`passkey_offer` of BFF User, MAIR-811). */
export type PasskeyOfferFlags = { allowed: boolean; registered: boolean };

/** « Ne plus me le proposer sur cet appareil »: remembered on this browser only, never on the account. */
export const OFFER_DISMISSED_STORAGE_ENTRY = "mairie360.passkey-offer.dismissed";

export function isPasskeyOfferDismissed(): boolean {
  try {
    return window.localStorage.getItem(OFFER_DISMISSED_STORAGE_ENTRY) === "1";
  } catch {
    return false;
  }
}

export function dismissPasskeyOffer(): void {
  try {
    window.localStorage.setItem(OFFER_DISMISSED_STORAGE_ENTRY, "1");
  } catch {
    // Storage refused (private window): the offer comes back at the next sign-in, nothing else changes.
  }
}

/**
 * F8 is proposed after a password sign-in when the mairie accepts passkeys, the account has none, the browser can create one
 * and the agent did not ask, on this device, not to be offered one again.
 */
export function shouldOfferPasskey(offer: PasskeyOfferFlags | undefined): boolean {
  return !!offer && offer.allowed && !offer.registered && isWebAuthnSupported() && !isPasskeyOfferDismissed();
}

/** The browser can create a passkey without a window, for the password it just filled in (Chrome, Safari). */
export async function canCreateAutomatically(): Promise<boolean> {
  try {
    const capabilities = await (window.PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> })
      .getClientCapabilities?.();
    return capabilities?.conditionalCreate === true;
  } catch {
    return false;
  }
}
