"use client";

import { BackButton, Body, Button, PageTitle, RadioGroup } from "@mairie360/lib-components/primitives";
import { AccountSecured } from "./components/AccountSecured";
import { AuthenticatorSetup } from "./components/AuthenticatorSetup";
import { BackupCodes } from "./components/BackupCodes";
import { PasskeyOnlyNotice } from "./components/PasskeyOnlyNotice";
import { useSecureAccountStep } from "./use-secure-account-step";
import type { SecureAccountMethod, SecureAccountOptions } from "./use-secure-account-step";

export type SecureAccountStepProps = SecureAccountOptions & {
  /** « Retour à la connexion »: forgets the enrolment token and shows the password form again. */
  onBack: () => void;
};

/** F7 of the Login mockup: the instance makes the second factor mandatory and the account has none yet. */
export function SecureAccountStep({ policy, onSuccess, onSessionOver, onBack }: SecureAccountStepProps) {
  const step = useSecureAccountStep({ policy, onSuccess, onSessionOver });

  if (step.stage === "secured") return <AccountSecured />;
  if (step.stage === "codes") {
    return <BackupCodes codes={step.backupCodes} acknowledged={step.acknowledged} onAcknowledgedChange={step.setAcknowledged} error={step.acknowledgeError} onFinish={step.onFinish} />;
  }
  if (step.stage === "app") {
    return (
      <AuthenticatorSetup
        showSteps={step.showSteps}
        enrolment={step.enrolment}
        isStarting={step.isStarting}
        code={step.code}
        onCodeChange={step.setCode}
        fieldError={step.fieldError}
        alert={step.alert}
        onDismissAlert={step.dismissAlert}
        isSubmitting={step.isSubmitting}
        locked={step.locked}
        onSubmit={step.onConfirm}
        onBack={onBack}
      />
    );
  }
  if (step.stage === "passkey-only") return <PasskeyOnlyNotice onBack={step.hasChoice ? step.backToChoice : onBack} />;

  return (
    <form method="post" onSubmit={step.onChoose} className="flex w-full flex-col items-stretch gap-5" noValidate>
      <PageTitle>Sécurisez votre compte</PageTitle>
      <Body>Votre mairie demande une double authentification. Choisissez comment confirmer que c’est bien vous à chaque connexion.</Body>
      <RadioGroup<SecureAccountMethod>
        label="Méthode de double authentification"
        name="method"
        variant="card"
        value={step.method}
        onChange={step.setMethod}
        options={[
          { value: "app", label: "Application d’authentification", hint: "Un code à 6 chiffres affiché par une application sur votre téléphone.", badge: "Recommandé" },
          { value: "passkey", label: "Passkey", hint: "Empreinte, visage ou code de votre appareil, sans mot de passe à retenir." },
        ]}
      />
      <Button fullWidth type="submit" label="Continuer" />
      <BackButton label="Retour à la connexion" type="button" onClick={onBack} className="self-start" />
    </form>
  );
}
