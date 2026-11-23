"use client";

import { BackButton, Body, Button, CopyField, ErrorAlert, OneTimeCodeField, Overline, PageTitle, QrCode, Spinner } from "@mairie360/lib-components/primitives";
import type { FormEvent } from "react";

export type AuthenticatorEnrolment = { secret: string; otpauthUri: string };
export type EnrolmentAlert = { title: string; description?: string };

export type AuthenticatorSetupProps = {
  /** « ÉTAPE 1 SUR 2 »: only when the backup codes follow. */
  showSteps: boolean;
  /** The secret and the otpauth:// URI, `null` while Core prepares them or when it could not. */
  enrolment: AuthenticatorEnrolment | null;
  isStarting: boolean;
  code: string;
  onCodeChange: (value: string) => void;
  fieldError: string;
  alert: EnrolmentAlert | null;
  onDismissAlert: () => void;
  isSubmitting: boolean;
  /** 429: the field and the button wait for the Retry-After delay. */
  locked: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

// « XXXX XXXX … »: the key read aloud or typed by hand is easier to follow in groups of four; the copied value stays whole.
const groupByFour = (secret: string) => secret.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");

/** F7 of the Login mockup, application branch: QR code, key to copy and the first code. */
export function AuthenticatorSetup({ showSteps, enrolment, isStarting, code, onCodeChange, fieldError, alert, onDismissAlert, isSubmitting, locked, onSubmit, onBack }: AuthenticatorSetupProps) {
  return (
    // Same rule as the password form: a native submission must never put anything in the URL.
    <form method="post" aria-busy={isStarting || isSubmitting} onSubmit={onSubmit} className="flex w-full flex-col items-stretch gap-5" noValidate>
      {showSteps && <Overline>ÉTAPE 1 SUR 2</Overline>}
      <PageTitle>Ajoutez Mairie 360 à votre application</PageTitle>
      <Body>Dans votre application d’authentification, ajoutez un compte puis scannez ce QR code.</Body>
      {alert && <ErrorAlert title={alert.title} description={alert.description} onDismiss={onDismissAlert} className="w-full" />}
      {isStarting && <Spinner size="l" className="self-center" />}
      {enrolment && (
        <>
          <QrCode value={enrolment.otpauthUri} label="QR code à scanner avec votre application d’authentification" className="self-start" />
          <CopyField label="Vous ne pouvez pas scanner ? Saisissez cette clé" value={enrolment.secret} display={groupByFour(enrolment.secret)} />
          <OneTimeCodeField
            label="Code affiché par l’application"
            placeholder="123456"
            hint="Le code change toutes les 30 secondes."
            required
            value={code}
            onValueChange={onCodeChange}
            error={fieldError || undefined}
            disabled={locked}
            name="code"
          />
          <Button fullWidth type="submit" loading={isSubmitting} disabled={locked} label={isSubmitting ? "Vérification…" : "Vérifier et continuer"} />
        </>
      )}
      <BackButton label="Retour à la connexion" type="button" onClick={onBack} className="self-start" />
    </form>
  );
}
