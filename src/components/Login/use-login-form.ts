'use client';

import { checkNewPassword } from "@mairie360/lib-components/shared";
import { confirmationFieldError, emailFieldError, focusField, PASSWORD_REQUIRED_MESSAGE } from "../../lib/password-recovery-validation";
import { FormEvent, useRef, useState } from "react";
import { shouldOfferPasskey, type PasskeyOfferFlags } from "./components/PasskeyOffer";
import type { SetupPolicy } from "./components/SecureAccountStep";
import { acknowledgeAlert, fetchPendingAlert, type SecurityAlert } from "./components/UnusualActivity";

type LoginResponse = {
  success?: boolean;
  message?: string;
  /** MAIR-1261: second line of the error alert (mock-up F1 / F2). */
  description?: string;
  requiresPasswordChange?: boolean;
  restartLogin?: boolean;
  requiresTwoFactor?: boolean;
  requiresTwoFactorSetup?: boolean;
  policy?: SetupPolicy;
  /** MAIR-811: whether to propose a passkey once signed in (password sign-ins only). */
  passkeyOffer?: PasskeyOfferFlags;
};

export type LoginFormOptions = {
  redirectUrl?: string;
  navigate: (url: string) => void;
};

// Password sign-in and the first-login password change of the sign-in card.
export function useLoginForm({ redirectUrl, navigate }: LoginFormOptions) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordChange, setIsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  // MAIR-1261: field messages of the mock-up, under the e-mail, the password and the confirmation.
  const [emailError, setEmailError] = useState("");
  const [credentialPasswordError, setCredentialPasswordError] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const [isTwoFactor, setIsTwoFactor] = useState(false);
  const [setupPolicy, setSetupPolicy] = useState<SetupPolicy | undefined>(undefined);
  const [isTwoFactorSetup, setIsTwoFactorSetup] = useState(false);
  const [errorDescription, setErrorDescription] = useState("");
  const [isPasskeyOffer, setIsPasskeyOffer] = useState(false);
  const [unusualAlert, setUnusualAlert] = useState<SecurityAlert | null>(null);
  const [pendingOffer, setPendingOffer] = useState<PasskeyOfferFlags | undefined>(undefined);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const submissionPending = useRef(false);

  const redirectAfterLogin = () => {
    if (redirectUrl) {
      navigate(redirectUrl);
    }
  };

  // MAIR-811 (F8): after a password sign-in, propose a passkey when the mairie accepts them, the account has none, the
  // browser can create one and the agent did not decline it on this device; otherwise open the module.
  const finishPasswordSignIn = (offer?: PasskeyOfferFlags) => {
    if (shouldOfferPasskey(offer)) {
      setIsTwoFactor(false);
      setIsPasskeyOffer(true);
      return;
    }
    redirectAfterLogin();
  };

  // MAIR-773 (F9): once a session is open (password, second step, passkey), a pending alert about a use of one of the
  // agent's sessions from another device comes first, before the passkey proposal or the module.
  const afterSignIn = async (offer?: PasskeyOfferFlags) => {
    const alert = await fetchPendingAlert();
    if (alert) {
      setIsTwoFactor(false);
      setIsTwoFactorSetup(false);
      setPendingOffer(offer);
      setUnusualAlert(alert);
      return;
    }
    finishPasswordSignIn(offer);
  };

  const continueAfterAlert = async () => {
    if (!unusualAlert) return;
    setIsAcknowledging(true);
    await acknowledgeAlert(unusualAlert.id);
    setIsAcknowledging(false);
    setUnusualAlert(null);
    finishPasswordSignIn(pendingOffer);
  };

  // « Ce n’était pas moi » : the alert is read, and the forgotten-password page opens with the e-mail prefilled.
  const notMeAfterAlert = async () => {
    if (!unusualAlert) return;
    setIsAcknowledging(true);
    await acknowledgeAlert(unusualAlert.id);
    const query = new URLSearchParams({ email: email.trim() });
    if (redirectUrl) query.set("redirect", redirectUrl);
    navigate(`/forgot-password?${query.toString()}`);
  };

  const loginWithPassword = async (passwordValue: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        password: passwordValue,
      }),
    });
    const result = (await response.json()) as LoginResponse;

    if (result.requiresTwoFactor) {
      setIsTwoFactor(true);
      setPassword("");
      setSuccessMessage("");
      return;
    }

    if (result.requiresTwoFactorSetup) {
      setSetupPolicy(result.policy);
      setIsTwoFactorSetup(true);
      setPassword("");
      setSuccessMessage("");
      return;
    }

    if (result.requiresPasswordChange) {
      setIsPasswordChange(true);
      setPassword("");
      setSuccessMessage("");
      return;
    }

    if (!response.ok) {
      setSuccessMessage("");
      setErrorMessage(result.message ?? "La connexion a échoué.");
      setErrorDescription(result.description ?? "");
      return;
    }

    setPassword("");
    setSuccessMessage("Connexion réussie.");
    await afterSignIn(result.passkeyOffer);
  };

  // The login token is over (expired, or burnt by five wrong codes): the password is asked again.
  const restartAfterExpiredSession = () => {
    setIsTwoFactor(false);
    setIsTwoFactorSetup(false);
    setPassword("");
    setSuccessMessage("");
    setErrorMessage("Votre session de connexion a expiré.");
    setErrorDescription("Saisissez de nouveau votre email et votre mot de passe.");
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionPending.current) return;
    setErrorMessage("");
    setErrorDescription("");
    setSuccessMessage("");

    const emailMessage = emailFieldError(email);
    const passwordMessage = password ? "" : PASSWORD_REQUIRED_MESSAGE;
    setEmailError(emailMessage);
    setCredentialPasswordError(passwordMessage);
    if (emailMessage || passwordMessage) {
      focusField(event.currentTarget, emailMessage ? "email" : "password");
      return;
    }

    submissionPending.current = true;
    setIsLoading(true);

    try {
      await loginWithPassword(password);
    } catch {
      setSuccessMessage("");
      setErrorMessage("Impossible de joindre le service de connexion.");
    } finally {
      submissionPending.current = false;
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionPending.current) return;
    setPasswordError("");
    setErrorMessage("");
    setSuccessMessage("");

    setErrorDescription("");
    // Both fields are checked at once and each shows its own message, as in the mock-up (F2 Cas 2 and Cas 3).
    const ruleError = checkNewPassword(newPassword) ?? "";
    const matchError = confirmationFieldError(newPassword, newPasswordConfirmation);
    setPasswordError(ruleError);
    setConfirmationError(matchError);
    if (ruleError || matchError) {
      focusField(event.currentTarget, ruleError ? "new-password" : "new-password-confirmation");
      return;
    }

    submissionPending.current = true;
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/force_change_password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword,
        }),
      });
      const result = (await response.json()) as LoginResponse;

      if (!response.ok) {
        if (result.restartLogin) {
          setIsPasswordChange(false);
          setNewPassword("");
          setNewPasswordConfirmation("");
        }

        setErrorMessage(result.message ?? "Le mot de passe n’a pas pu être modifié.");
        setErrorDescription(result.description ?? "");
        return;
      }

      const updatedPassword = newPassword;

      setIsPasswordChange(false);
      setPassword(updatedPassword);
      setNewPassword("");
      setNewPasswordConfirmation("");
      setSuccessMessage("Mot de passe modifié. Connexion en cours…");
      await loginWithPassword(updatedPassword);
    } catch {
      setSuccessMessage("");
      setErrorMessage("Impossible de joindre le service de connexion.");
    } finally {
      submissionPending.current = false;
      setIsLoading(false);
    }
  };

  return {
    email, setEmail: (value: string) => { setEmailError(""); setEmail(value); }, password, setPassword: (value: string) => { setCredentialPasswordError(""); setPassword(value); },
    emailError, credentialPasswordError, confirmationError,
    isPasswordChange, newPassword, setNewPassword: (value: string) => { setPasswordError(""); setNewPassword(value); }, passwordError, newPasswordConfirmation,
    setNewPasswordConfirmation: (value: string) => { setConfirmationError(""); setNewPasswordConfirmation(value); },
    isLoading, errorMessage, errorDescription, successMessage, isTwoFactor, isTwoFactorSetup, setupPolicy, isPasskeyOffer,
    unusualAlert, isAcknowledging, continueAfterAlert, notMeAfterAlert,
    dismissError: () => { setErrorMessage(""); setErrorDescription(""); },
    completeTwoFactor: () => { void afterSignIn(); },
    completePasswordSecondStep: (offer?: PasskeyOfferFlags) => { void afterSignIn(offer); },
    finishPasskeyOffer: redirectAfterLogin,
    restartAfterExpiredSession,
    backToCredentials: () => { setIsTwoFactor(false); setIsTwoFactorSetup(false); },
    onSubmit: isPasswordChange ? handlePasswordChange : handleLogin,
  };
}
