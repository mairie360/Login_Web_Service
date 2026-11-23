"use client";

import { Button, ErrorAlert, PageTitle, SuccessAlert, TextField } from "@mairie360/lib-components/primitives";
import type { FormEvent } from "react";

export type PasskeySavedProps = {
  /** The passkey manager Core recognised, `null` when unknown. */
  provider: string | null;
  name: string;
  onNameChange: (value: string) => void;
  nameError: string;
  alert: { title: string; description?: string } | null;
  onDismissAlert: () => void;
  isSaving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/** F8 of the Login mockup, « Passkey enregistrée » (screen 36): the name is the manager's by default and can be changed. */
export function PasskeySaved({ provider, name, onNameChange, nameError, alert, onDismissAlert, isSaving, onSubmit }: PasskeySavedProps) {
  return (
    // Same rule as the password form: a native submission must never put anything in the URL.
    <form method="post" aria-busy={isSaving} onSubmit={onSubmit} className="flex w-full flex-col items-stretch gap-5" noValidate>
      <PageTitle>Passkey enregistrée</PageTitle>
      <SuccessAlert
        title="Votre passkey est prête."
        description={provider ? `Elle est enregistrée dans ${provider}. Utilisez-la à votre prochaine connexion.` : "Utilisez-la à votre prochaine connexion."}
      />
      {alert && <ErrorAlert title={alert.title} description={alert.description} onDismiss={onDismissAlert} className="w-full" />}
      <TextField
        label="Nom de la passkey"
        hint="Pour la reconnaître ensuite dans Paramètres, rubrique Sécurité."
        required
        maxLength={100}
        autoComplete="off"
        name="label"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        error={nameError || undefined}
        disabled={isSaving}
      />
      <Button fullWidth type="submit" loading={isSaving} label="Continuer" />
    </form>
  );
}
