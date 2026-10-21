import { LoginField } from "./LoginField";

export interface CredentialsFieldsProps {
  email: string;
  password: string;
  disabled: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}

/** Professional email and current password. */
export const CredentialsFields = ({ email, password, disabled, onEmailChange, onPasswordChange }: CredentialsFieldsProps) => (
  <>
    <LoginField id="email" label="Email professionnel" type="email" value={email} autoComplete="email" disabled={disabled}
      placeholder="exemple@domaine.com" onChange={onEmailChange} wrapperClassName="text-[var(--mairie-text)]" />
    <LoginField id="password" label="Mot de passe" type="password" value={password} autoComplete="current-password" disabled={disabled}
      onChange={onPasswordChange} labelRow />
  </>
);
