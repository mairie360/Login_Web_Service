"use client";

import { Divider, ErrorAlert, InfoAlert, PasskeyButton } from "@mairie360/lib-components/primitives";
import { usePasskeySignIn } from "./use-passkey-sign-in";

export interface PasskeySignInProps {
  /** Called once the passkey opened the session: the card redirects to the requested module. */
  onSuccess: () => void;
}

/**
 * « ou » separator and « Se connecter avec une passkey » button under the main action (mock-up F5). Nothing is shown
 * without WebAuthn or when the mairie does not accept passkeys; without a relying party on the instance an
 * information tells to use the password. A passkey is a second factor on its own: no code step follows.
 */
export const PasskeySignIn = ({ onSuccess }: PasskeySignInProps) => {
  const passkey = usePasskeySignIn(onSuccess);

  if (passkey.availability === "checking" || passkey.availability === "hidden") return null;

  if (passkey.availability === "unavailable") {
    return <InfoAlert title="Connexion par passkey indisponible pour le moment. Utilisez votre mot de passe." className="w-full" />;
  }

  return (
    <>
      <Divider label="ou" />
      {passkey.error && <ErrorAlert title={passkey.error} onDismiss={passkey.dismissError} className="w-full" />}
      <PasskeyButton type="button" loading={passkey.busy} onClick={passkey.signIn} className="w-full" />
    </>
  );
};
