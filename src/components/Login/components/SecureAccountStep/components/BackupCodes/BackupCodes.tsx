"use client";

import { Body, Button, Checkbox, Overline, PageTitle, RecoveryCodes, WarningAlert } from "@mairie360/lib-components/primitives";
import type { FormEvent } from "react";

export type BackupCodesProps = {
  codes: readonly string[];
  acknowledged: boolean;
  onAcknowledgedChange: (checked: boolean) => void;
  /** « Confirmez que vous avez enregistré vos codes. » once « Terminer » was pressed without the box ticked. */
  error: string;
  onFinish: (event: FormEvent<HTMLFormElement>) => void;
};

/** F7 of the Login mockup, step 2: the ten backup codes, shown once, and the box to tick before finishing. */
export function BackupCodes({ codes, acknowledged, onAcknowledgedChange, error, onFinish }: BackupCodesProps) {
  return (
    <form method="post" onSubmit={onFinish} className="flex w-full flex-col items-stretch gap-5" noValidate>
      <Overline>ÉTAPE 2 SUR 2</Overline>
      <PageTitle>Enregistrez vos codes de secours</PageTitle>
      <Body>Si vous perdez votre téléphone, chaque code vous permet de vous connecter une fois.</Body>
      <WarningAlert title="Ces codes ne seront plus affichés." description="Gardez-les dans un endroit sûr, hors de cet ordinateur : imprimés ou dans un coffre-fort de mots de passe." className="w-full" />
      <RecoveryCodes codes={codes} />
      <Checkbox
        label="J’ai enregistré mes codes de secours en lieu sûr."
        checked={acknowledged}
        onChange={(event) => onAcknowledgedChange(event.target.checked)}
        error={error || undefined}
        name="acknowledged"
      />
      <Button fullWidth type="submit" label="Terminer" />
    </form>
  );
}
