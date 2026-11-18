"use client";

import { BackButton, Body, Button, ErrorAlert, LinkButton, OneTimeCodeField, PageTitle } from "@mairie360/lib-components/primitives";
import { useTwoFactorStep } from "./use-two-factor-step";
import type { SecondStepOptions } from "./use-two-factor-step";

export type TwoFactorStepProps = SecondStepOptions & {
  /** « Retour à la connexion »: forgets the login token and shows the password form again. */
  onBack: () => void;
};

const copy = {
  totp: {
    title: "Code de vérification",
    body: "Ouvrez votre application d’authentification et saisissez le code à 6 chiffres affiché pour Mairie 360.",
    label: "Code de vérification",
    placeholder: "123456",
    switchLabel: "Utiliser un code de secours",
  },
  recovery: {
    title: "Code de secours",
    body: "Saisissez l’un des codes de secours que vous avez enregistrés. Chaque code ne sert qu’une fois.",
    label: "Code de secours",
    placeholder: "XXXX-XXXX",
    switchLabel: "Utiliser le code de l’application",
  },
} as const;

/** F6 of the Login mockup: the code asked after a correct password on a protected account. */
export function TwoFactorStep({ onSuccess, onSessionOver, onBack }: TwoFactorStepProps) {
  const step = useTwoFactorStep({ onSuccess, onSessionOver });
  const texts = copy[step.mode];

  return (
    // Same rule as the password form: a native submission must never put anything in the URL.
    <form method="post" aria-busy={step.isLoading} onSubmit={step.onSubmit} className="flex w-full flex-col items-stretch gap-5" noValidate>
      <PageTitle>{texts.title}</PageTitle>
      <Body>{texts.body}</Body>
      {step.alert && <ErrorAlert title={step.alert.title} description={step.alert.description} onDismiss={step.dismissAlert} className="w-full" />}
      <OneTimeCodeField
        key={step.mode}
        kind={step.mode}
        label={texts.label}
        placeholder={texts.placeholder}
        hint=""
        required
        autoFocus
        value={step.code}
        onValueChange={step.setCode}
        error={step.fieldError || undefined}
        disabled={step.locked}
        name="code"
      />
      <Button fullWidth type="submit" loading={step.isLoading} disabled={step.locked} label={step.isLoading ? "Vérification…" : "Vérifier"} />
      <LinkButton label={texts.switchLabel} size="s" className="self-start" onClick={() => step.setMode(step.mode === "totp" ? "recovery" : "totp")} />
      <BackButton label="Retour à la connexion" type="button" onClick={onBack} className="self-start" />
    </form>
  );
}
