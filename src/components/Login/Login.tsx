"use client";

import { Divider, LinkButton, PageTitle } from "@mairie360/lib-components/primitives";
import type { ReactNode } from "react";
import RecoveryLayout from "../RecoveryLayout";
import { CredentialsFields } from "./components/CredentialsFields";
import { LoginFeedback } from "./components/LoginFeedback";
import { LoginSubmit } from "./components/LoginSubmit";
import { PasswordChangeFields } from "./components/PasswordChangeFields";
import { TwoFactorStep } from "./components/TwoFactorStep";
import { useLoginForm } from "./use-login-form";

type LoginProps = {
  redirectUrl?: string;
  navigate?: (url: string) => void;
  /** Passkey sign-in button (MAIR-811), shown under the main action after an « ou » separator. */
  passkeySlot?: ReactNode;
};

const navigateToFront = (url: string) => window.location.assign(url);

export default function Login({ redirectUrl, navigate = navigateToFront, passkeySlot }: LoginProps) {
  const form = useLoginForm({ redirectUrl, navigate });

  if (form.isTwoFactor) {
    return (
      <RecoveryLayout>
        <TwoFactorStep onSuccess={form.completeTwoFactor} onSessionOver={form.restartAfterExpiredSession} onBack={form.backToCredentials} />
      </RecoveryLayout>
    );
  }

  return (
    <RecoveryLayout>
      <form
        // method="post": without JavaScript (robot, JS disabled) a native submission
        // must never place the credentials in the URL.
        method="post"
        aria-busy={form.isLoading}
        onSubmit={form.onSubmit}
        className="flex w-full flex-col items-stretch gap-4"
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
        {!form.isPasswordChange && <LinkButton label="Mot de passe oublié ?" href={redirectUrl ? `/forgot-password?redirect=${encodeURIComponent(redirectUrl)}` : "/forgot-password"} size="s" className="self-start" />}
        <LoginFeedback error={form.errorMessage} errorDescription={form.errorDescription} success={form.successMessage} onDismissError={form.dismissError} />
        <LoginSubmit loading={form.isLoading} passwordChange={form.isPasswordChange} />
        {!form.isPasswordChange && passkeySlot && <><Divider label="ou" />{passkeySlot}</>}
      </form>
    </RecoveryLayout>
  );
}
