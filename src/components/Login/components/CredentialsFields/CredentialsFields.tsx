import { EmailField, PasswordField } from "@mairie360/lib-components/primitives";

export interface CredentialsFieldsProps {
  email: string;
  password: string;
  disabled: boolean;
  /** MAIR-1261: messages under the fields (mock-up F1). */
  emailError?: string;
  passwordError?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}

/** Professional email and current password (F1); `webauthn` lets a browser offer a passkey (MAIR-811). */
export const CredentialsFields = ({ email, password, disabled, emailError, passwordError, onEmailChange, onPasswordChange }: CredentialsFieldsProps) => (
  <>
    <EmailField id="email" name="email" label="Email professionnel" autoComplete="username webauthn" placeholder="exemple@domaine.com" required
      value={email} error={emailError || undefined} disabled={disabled} onChange={(event) => onEmailChange(event.target.value)} />
    <PasswordField id="password" name="password" label="Mot de passe" autoComplete="current-password" required
      value={password} error={passwordError || undefined} disabled={disabled} onChange={(event) => onPasswordChange(event.target.value)} />
  </>
);
