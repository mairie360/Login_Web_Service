import { ErrorAlert } from "@mairie360/lib-components/primitives";

export interface LoginFeedbackProps {
  resuming: boolean;
  error: string;
  success: string;
  onDismissError: () => void;
}

/** Session resume status, the dismissible error (lib ErrorAlert) and the success message. */
export const LoginFeedback = ({ resuming, error, success, onDismissError }: LoginFeedbackProps) => (
  <>
    {resuming && <p role="status" className="text-sm leading-5 text-[var(--mairie-muted)]">Reprise de votre session…</p>}
    {error && <ErrorAlert title={error} onDismiss={onDismissError} className="w-full" />}
    {success && (
      <p role="status" className="w-full rounded-md bg-[var(--mairie-success-surface)] px-3 py-2 text-sm text-[var(--mairie-success-text)]">
        {success}
      </p>
    )}
  </>
);
