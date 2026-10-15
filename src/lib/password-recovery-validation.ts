// Constraints of ForgotPasswordView and ResetPasswordView in the published BFF User package.
export const RESET_TOKEN_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const RECOVERY_EMAIL_PATTERN = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
export const RECOVERY_SENT_MESSAGE = "Si un compte existe, un e-mail a été envoyé.";
export const RESET_EXPIRED_MESSAGE = "Ce lien est expiré ou déjà utilisé. Demandez un nouveau lien.";
