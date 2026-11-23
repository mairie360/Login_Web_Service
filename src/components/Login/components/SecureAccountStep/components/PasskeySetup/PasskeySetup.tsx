"use client";

import { BackButton, Body, Button, ErrorAlert, PageTitle, TextField } from "@mairie360/lib-components/primitives";
import type { FormEvent } from "react";
import type { EnrolmentAlert } from "../AuthenticatorSetup";

export type PasskeySetupProps = {
  label: string;
  onLabelChange: (value: string) => void;
  fieldError: string;
  alert: EnrolmentAlert | null;
  onDismissAlert: () => void;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** « Choisir une autre méthode » when both methods are allowed, « Retour à la connexion » otherwise. */
  backLabel: string;
  onBack: () => void;
};

/** F7 of the Login mockup, passkey branch: the name of the passkey, then the browser asks for the fingerprint, face or device code. */
export function PasskeySetup({ label, onLabelChange, fieldError, alert, onDismissAlert, isSubmitting, onSubmit, backLabel, onBack }: PasskeySetupProps) {
  return (
    // Same rule as the password form: a native submission must never put anything in the URL.
    <form method="post" aria-busy={isSubmitting} onSubmit={onSubmit} className="flex w-full flex-col items-stretch gap-5" noValidate>
      <PageTitle>Créer une passkey</PageTitle>
      <Body>Votre navigateur va vous demander votre empreinte, votre visage ou le code de cet appareil. Mairie 360 ne les reçoit jamais.</Body>
      {alert && <ErrorAlert title={alert.title} description={alert.description} onDismiss={onDismissAlert} className="w-full" />}
      <TextField
        label="Nom de la passkey"
        placeholder="Ordinateur du bureau"
        hint="Pour la reconnaître ensuite dans vos paramètres."
        required
        maxLength={100}
        autoComplete="off"
        name="label"
        value={label}
        onChange={(event) => onLabelChange(event.target.value)}
        error={fieldError || undefined}
        disabled={isSubmitting}
      />
      <Button fullWidth type="submit" loading={isSubmitting} label={isSubmitting ? "Création…" : "Créer la passkey"} />
      <BackButton label={backLabel} type="button" onClick={onBack} disabled={isSubmitting} className="self-start" />
    </form>
  );
}
