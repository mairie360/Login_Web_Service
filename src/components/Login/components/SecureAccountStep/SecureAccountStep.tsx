"use client";

import { BackButton, Body, Button, InfoAlert, PageTitle, RadioGroup } from "@mairie360/lib-components/primitives";
import { AccountSecured } from "./components/AccountSecured";
import { AuthenticatorSetup } from "./components/AuthenticatorSetup";
import { BackupCodes } from "./components/BackupCodes";
import { PasskeySetup } from "./components/PasskeySetup";
import { PasskeyUnsupported } from "./components/PasskeyUnsupported";
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
  if (step.stage === "passkey") {
    return (
      <PasskeySetup
        label={step.label}
        onLabelChange={step.setLabel}
        fieldError={step.labelError}
        alert={step.alert}
        onDismissAlert={step.dismissAlert}
        isSubmitting={step.isSubmitting}
        onSubmit={step.onCreatePasskey}
        backLabel={step.hasChoice ? "Choisir une autre méthode" : "Retour à la connexion"}
        onBack={step.hasChoice ? step.backToChoice : onBack}
      />
    );
  }
  if (step.stage === "passkey-unsupported") return <PasskeyUnsupported onBack={onBack} />;

  return (
    <form method="post" onSubmit={step.onChoose} className="flex w-full flex-col items-stretch gap-5" noValidate>
      <PageTitle>Sécurisez votre compte</PageTitle>
      <Body>Votre mairie demande une double authentification. Choisissez comment confirmer que c’est bien vous à chaque connexion.</Body>
      <RadioGroup<SecureAccountMethod>
        label="Méthode de vérification"
        name="method"
        variant="card"
        value={step.method}
        onChange={step.setMethod}
        options={[
          { value: "passkey", label: "Passkey", hint: "Votre empreinte, votre visage ou le code de votre appareil. Rien à recopier, et impossible à voler par un faux site.", badge: "Recommandé" },
          { value: "app", label: "Application d’authentification", hint: "Un code à 6 chiffres affiché par une application comme FreeOTP, Google Authenticator ou Microsoft Authenticator." },
        ]}
      />
      <InfoAlert title="Encore une étape." description="Vous accéderez à vos modules dès que votre compte sera sécurisé." className="w-full" />
      <Button fullWidth type="submit" label="Continuer" />
      <BackButton label="Retour à la connexion" type="button" onClick={onBack} className="self-start" />
    </form>
  );
}
