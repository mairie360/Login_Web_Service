import { Body, NewPasswordField, PasswordField } from "@mairie360/lib-components/primitives";

export interface PasswordChangeFieldsProps {
  password: string;
  confirmation: string;
  disabled: boolean;
  /** Message of the 12-character rule (checkNewPassword), shown on the new password field. */
  passwordError?: string;
  /** MAIR-1261: « Confirmez le mot de passe. » / « Les deux mots de passe ne correspondent pas. » (mock-up F2). */
  confirmationError?: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
}

/** First connection (F2): the new password and its rule as help text, then the confirmation. */
export const PasswordChangeFields = ({ password, confirmation, disabled, passwordError, confirmationError, onPasswordChange, onConfirmationChange }: PasswordChangeFieldsProps) => (
  <>
    <Body>Pour finaliser votre première connexion, choisissez un nouveau mot de passe.</Body>
    <NewPasswordField id="new-password" name="new-password" required value={password} disabled={disabled} error={passwordError || undefined} onChange={(event) => onPasswordChange(event.target.value)} />
    <PasswordField id="new-password-confirmation" name="new-password-confirmation" label="Confirmer le mot de passe" autoComplete="new-password" required value={confirmation} disabled={disabled} error={confirmationError || undefined} onChange={(event) => onConfirmationChange(event.target.value)} />
  </>
);
