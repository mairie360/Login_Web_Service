"use client";

import { BodySmall, PageTitle, Spinner, SuccessAlert } from "@mairie360/lib-components/primitives";

/** F7 of the Login mockup, last screen: the account is secured, the requested module opens by itself. */
export function AccountSecured() {
  return (
    <div className="flex w-full flex-col items-stretch gap-5">
      <PageTitle>Sécurisez votre compte</PageTitle>
      <SuccessAlert title="Votre compte est sécurisé." description="Vous pourrez gérer votre double authentification dans Paramètres, rubrique Sécurité." className="w-full" />
      <div className="flex items-center gap-2">
        <Spinner size="s" />
        <BodySmall>Ouverture de votre module…</BodySmall>
      </div>
    </div>
  );
}
