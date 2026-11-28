// Constraints of ForgotPasswordView and ResetPasswordView in the published BFF User package.
export const RESET_TOKEN_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const RECOVERY_EMAIL_PATTERN = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
// MAIR-1261: the texts of the mock-up (F3 Cas 2, F4 Cas 1 and Cas 7), title then description of the lib alert.
export const RECOVERY_SENT_TITLE = "Lien envoyé.";
export const RECOVERY_SENT_MESSAGE = "Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.";
export const RESET_EXPIRED_TITLE = "Lien invalide ou expiré.";
export const RESET_EXPIRED_DESCRIPTION = "Demandez un nouveau lien pour continuer.";
export const RESET_EXPIRED_MESSAGE = `${RESET_EXPIRED_TITLE} ${RESET_EXPIRED_DESCRIPTION}`;
export const RESET_DONE_TITLE = "Mot de passe modifié.";
export const RESET_DONE_DESCRIPTION = "Vous pouvez vous connecter.";
export const PASSWORD_REFUSED_TITLE = "Mot de passe refusé.";
// Field messages of the mock-up (F1, F2, F3, F4), shown under the field instead of a page alert.
export const EMAIL_REQUIRED_MESSAGE = "Renseignez votre email professionnel.";
export const EMAIL_INVALID_MESSAGE = "Saisissez une adresse e-mail valide, par exemple prenom.nom@mairie.fr.";
export const PASSWORD_REQUIRED_MESSAGE = "Renseignez votre mot de passe.";
export const CONFIRMATION_REQUIRED_MESSAGE = "Confirmez le mot de passe.";
export const CONFIRMATION_MISMATCH_MESSAGE = "Les deux mots de passe ne correspondent pas.";

/** Message of the professional e-mail field, `""` when it is valid. */
export function emailFieldError(value: string): string {
  const email = value.trim();
  if (!email) return EMAIL_REQUIRED_MESSAGE;
  return email.length > 320 || !RECOVERY_EMAIL_PATTERN.test(email) ? EMAIL_INVALID_MESSAGE : "";
}

/** Message of the confirmation field of a new password, `""` when it matches. */
export function confirmationFieldError(password: string, confirmation: string): string {
  if (!confirmation) return CONFIRMATION_REQUIRED_MESSAGE;
  return password === confirmation ? "" : CONFIRMATION_MISMATCH_MESSAGE;
}
// MAIR-757: Core API's password policy (CNIL 2022). The BFF does not relay which rule Core refused, so a 400 shows all of them.
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 255;
export const PASSWORD_POLICY_MESSAGE = "Ce mot de passe n’est pas accepté : utilisez au moins 12 caractères, évitez les mots de passe courants et n’y mettez ni votre adresse e-mail, ni votre prénom, ni votre nom.";

/** Moves the focus to the first refused field of a form validated by the page (`noValidate`), as the browser would. */
export function focusField(form: unknown, id: string): void {
  const owner = form as { querySelector?: (selector: string) => { focus?: () => void } | null } | null | undefined;
  owner?.querySelector?.(`#${id}`)?.focus?.();
}
