"use client";

import { BodySmall, PageTitle, Spinner, SuccessAlert } from "@mairie360/lib-components/primitives";

/**
 * F8 of the Login mockup, « Création automatique par le gestionnaire »: the sign-in succeeded and the browser may create the
 * passkey by itself for the password it filled in; the module opens right after, or the offer is shown if it declines.
 */
export function AutomaticCreation() {
  return (
    <div className="flex w-full flex-col items-stretch gap-5" aria-busy="true">
      <PageTitle>Connexion</PageTitle>
      <SuccessAlert title="Connexion réussie." />
      <div className="flex items-center gap-2">
        <Spinner size="s" />
        <BodySmall className="m-0">Ouverture de votre module…</BodySmall>
      </div>
    </div>
  );
}
