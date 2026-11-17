import { ErrorAlert, SuccessAlert } from "@mairie360/lib-components/primitives";

export interface LoginFeedbackProps {
  error: string;
  success: string;
  onDismissError: () => void;
}

/** The dismissible error (lib ErrorAlert) and the lib SuccessAlert. */
export const LoginFeedback = ({ error, success, onDismissError }: LoginFeedbackProps) => (
  <>
    {error && <ErrorAlert title={error} onDismiss={onDismissError} className="w-full" />}
    {success && <SuccessAlert title={success} className="w-full" />}
  </>
);
