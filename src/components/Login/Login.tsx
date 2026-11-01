"use client";

import Image from "next/image";
import { CredentialsFields } from "./components/CredentialsFields";
import { LoginFeedback } from "./components/LoginFeedback";
import { LoginSubmit } from "./components/LoginSubmit";
import { PasswordChangeFields } from "./components/PasswordChangeFields";
import { SingleAccountLink } from "./components/SingleAccountLink";
import { useLoginForm } from "./use-login-form";

type LoginProps = {
  redirectUrl?: string;
  navigate?: (url: string) => void;
  resumeSession?: boolean;
  /** Start of the Keycloak sign-in (MAIR-153), absent when the instance does not configure it. */
  keycloakLoginUrl?: string;
  /** Message of a Keycloak sign-in that came back without a session. */
  initialError?: string;
};

const navigateToFront = (url: string) => window.location.assign(url);

export default function Login({ redirectUrl, navigate = navigateToFront, resumeSession = false, keycloakLoginUrl, initialError = "" }: LoginProps) {
  const form = useLoginForm({ redirectUrl, navigate, resumeSession, initialError });

  return (
    <div className="flex w-full flex-col items-center justify-center px-6 py-8">
      <Image
        src="/logo.png"
        alt="Logo Mairie360"
        width={400}
        height={104}
        className="mb-4 max-w-full"
        priority
      />

      <form
        // method="post": without JavaScript (robot, JS disabled) a native submission
        // must never place the credentials in the URL.
        method="post"
        aria-busy={form.isLoading}
        onSubmit={form.onSubmit}
        className="flex flex-col items-start gap-4 w-full max-w-md p-6 rounded-2xl border border-[var(--mairie-border)] bg-[var(--mairie-surface)] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.10),0_8px_10px_-6px_rgba(0,0,0,0.10)] [&_input]:!my-0 [&_*]:!mb-0"
      >
        <h1 className="text-2xl font-bold text-[var(--mairie-text)] !mb-2">
          {form.isPasswordChange ? "Nouveau mot de passe" : "Connexion"}
        </h1>
        {form.isPasswordChange ? (
          <PasswordChangeFields
            password={form.newPassword}
            confirmation={form.newPasswordConfirmation}
            disabled={form.isLoading}
            onPasswordChange={form.setNewPassword}
            onConfirmationChange={form.setNewPasswordConfirmation}
          />
        ) : (
          <CredentialsFields email={form.email} password={form.password} disabled={form.isLoading} onEmailChange={form.setEmail} onPasswordChange={form.setPassword} />
        )}
        {!form.isPasswordChange && <a href={redirectUrl ? `/forgot-password?redirect=${encodeURIComponent(redirectUrl)}` : "/forgot-password"} className="text-sm text-[var(--mairie-accent)] underline focus-visible:outline-2 focus-visible:outline-offset-2">Mot de passe oublié ?</a>}
        <LoginFeedback resuming={form.isResuming} error={form.errorMessage} success={form.successMessage} onDismissError={form.dismissError} />
        <LoginSubmit loading={form.isLoading} passwordChange={form.isPasswordChange} />
        {keycloakLoginUrl && !form.isPasswordChange && <SingleAccountLink href={keycloakLoginUrl} disabled={form.isLoading} />}
      </form>
    </div>
  );
}
