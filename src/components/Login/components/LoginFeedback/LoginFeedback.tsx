import { ErrorAlert, SuccessAlert } from "@mairie360/lib-components/primitives";

export interface LoginFeedbackProps {
  error: string;
  errorDescription?: string;
  success: string;
  onDismissError: () => void;
}

/** The dismissible error (lib ErrorAlert) and the lib SuccessAlert. */
export const LoginFeedback = ({ error, errorDescription, success, onDismissError }: LoginFeedbackProps) => (
  <>
    {error && <ErrorAlert title={error} description={errorDescription || undefined} onDismiss={onDismissError} className="w-full" />}
    {success && <SuccessAlert title={success} className="w-full" />}
  </>
);
