"use client";

import { BackButton, Body, PageTitle, WarningAlert } from "@mairie360/lib-components/primitives";

export type PasskeyOnlyNoticeProps = {
  /** « Retour à la connexion »: forgets the enrolment token and shows the password form again. */
  onBack: () => void;
};

/**
 * The administrator only allows passkeys, which this screen cannot create yet (passkey enrolment comes with the passkey
 * sign-in, MAIR-811): the agent is told instead of being offered a method the instance would refuse.
 */
export function PasskeyOnlyNotice({ onBack }: PasskeyOnlyNoticeProps) {
  return (
    <div className="flex w-full flex-col items-stretch gap-5">
      <PageTitle>Sécurisez votre compte</PageTitle>
      <Body>Votre mairie demande une double authentification. Choisissez comment confirmer que c’est bien vous à chaque connexion.</Body>
      <WarningAlert title="La création d’une passkey n’est pas encore disponible." description="Contactez votre administrateur." className="w-full" />
      <BackButton label="Retour à la connexion" type="button" onClick={onBack} className="self-start" />
    </div>
  );
}
