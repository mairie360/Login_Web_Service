"use client";

import { BackButton, Body, PageTitle, WarningAlert } from "@mairie360/lib-components/primitives";

export type PasskeyUnsupportedProps = {
  /** « Retour à la connexion »: forgets the enrolment token and shows the password form again. */
  onBack: () => void;
};

/** F7 of the Login mockup, « navigateur non compatible »: the administrator only allows passkeys and this browser cannot create one. */
export function PasskeyUnsupported({ onBack }: PasskeyUnsupportedProps) {
  return (
    <div className="flex w-full flex-col items-stretch gap-5">
      <PageTitle>Sécurisez votre compte</PageTitle>
      <Body>Votre mairie demande une double authentification. Choisissez comment confirmer que c’est bien vous à chaque connexion.</Body>
      <WarningAlert
        title="Votre navigateur ne permet pas de créer une passkey."
        description="Ouvrez Mairie 360 dans un navigateur récent (Firefox, Chrome, Edge ou Safari), ou contactez votre administrateur."
        className="w-full"
      />
      <BackButton label="Retour à la connexion" type="button" onClick={onBack} className="self-start" />
    </div>
  );
}
