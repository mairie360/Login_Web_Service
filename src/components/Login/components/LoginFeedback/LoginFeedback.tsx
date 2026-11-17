import { ErrorAlert } from "@mairie360/lib-components/primitives";

export interface LoginFeedbackProps {
  error: string;
  success: string;
  onDismissError: () => void;
}

/** The dismissible error (lib ErrorAlert) and the success message. */
export const LoginFeedback = ({ error, success, onDismissError }: LoginFeedbackProps) => (
  <>
    {error && <ErrorAlert title={error} onDismiss={onDismissError} className="w-full" />}
    {success && (
      <p role="status" className="w-full rounded-md bg-[var(--mairie-success-surface)] px-3 py-2 text-sm text-[var(--mairie-success-text)]">
        {success}
      </p>
    )}
  </>
);
