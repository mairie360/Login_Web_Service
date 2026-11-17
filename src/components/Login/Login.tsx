"use client";

import { PageTitle } from "@mairie360/lib-components/primitives";
import RecoveryLayout from "../RecoveryLayout";
import { CredentialsFields } from "./components/CredentialsFields";
import { LoginFeedback } from "./components/LoginFeedback";
import { LoginSubmit } from "./components/LoginSubmit";
import { PasswordChangeFields } from "./components/PasswordChangeFields";
import { useLoginForm } from "./use-login-form";

type LoginProps = {
  redirectUrl?: string;
  navigate?: (url: string) => void;
};

const navigateToFront = (url: string) => window.location.assign(url);

export default function Login({ redirectUrl, navigate = navigateToFront }: LoginProps) {
  const form = useLoginForm({ redirectUrl, navigate });

  return (
    <RecoveryLayout>
      <form
        // method="post": without JavaScript (robot, JS disabled) a native submission
        // must never place the credentials in the URL.
        method="post"
        aria-busy={form.isLoading}
        onSubmit={form.onSubmit}
        className="flex w-full flex-col items-stretch gap-4 [&_input]:!my-0"
      >
        <PageTitle>{form.isPasswordChange ? "Nouveau mot de passe" : "Connexion"}</PageTitle>
        {form.isPasswordChange ? (
          <PasswordChangeFields
            password={form.newPassword}
            confirmation={form.newPasswordConfirmation}
            passwordError={form.passwordError}
            disabled={form.isLoading}
            onPasswordChange={form.setNewPassword}
            onConfirmationChange={form.setNewPasswordConfirmation}
          />
        ) : (
          <CredentialsFields email={form.email} password={form.password} disabled={form.isLoading} onEmailChange={form.setEmail} onPasswordChange={form.setPassword} />
        )}
        {!form.isPasswordChange && <a href={redirectUrl ? `/forgot-password?redirect=${encodeURIComponent(redirectUrl)}` : "/forgot-password"} className="text-sm text-[var(--mairie-accent)] underline focus-visible:outline-2 focus-visible:outline-offset-2">Mot de passe oublié ?</a>}
        <LoginFeedback error={form.errorMessage} success={form.successMessage} onDismissError={form.dismissError} />
        <LoginSubmit loading={form.isLoading} passwordChange={form.isPasswordChange} />
      </form>
    </RecoveryLayout>
  );
}
