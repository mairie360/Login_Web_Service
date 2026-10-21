import { LoginField } from '../LoginField';

export interface PasswordChangeFieldsProps {
  password: string;
  confirmation: string;
  disabled: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
}

/** First connection: the new password, typed twice. */
export const PasswordChangeFields = ({ password, confirmation, disabled, onPasswordChange, onConfirmationChange }: PasswordChangeFieldsProps) => (
  <>
    <p className="text-sm leading-5 text-[var(--mairie-muted)]">
      Pour finaliser votre première connexion, choisissez un nouveau
      mot de passe.
    </p>
    <LoginField id="new-password" label="Nouveau mot de passe" type="password" value={password} autoComplete="new-password" disabled={disabled} onChange={onPasswordChange} />
    <LoginField id="new-password-confirmation" label="Confirmer le mot de passe" type="password" value={confirmation} autoComplete="new-password" disabled={disabled} onChange={onConfirmationChange} />
  </>
);
