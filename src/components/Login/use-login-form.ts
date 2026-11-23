'use client';

import { checkNewPassword } from "@mairie360/lib-components/shared";
import { FormEvent, useRef, useState } from "react";
import { shouldOfferPasskey, type PasskeyOfferFlags } from "./components/PasskeyOffer";
import type { SetupPolicy } from "./components/SecureAccountStep";

type LoginResponse = {
  success?: boolean;
  message?: string;
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
  const [isTwoFactor, setIsTwoFactor] = useState(false);
  const [setupPolicy, setSetupPolicy] = useState<SetupPolicy | undefined>(undefined);
  const [isTwoFactorSetup, setIsTwoFactorSetup] = useState(false);
  const [errorDescription, setErrorDescription] = useState("");
  const [isPasskeyOffer, setIsPasskeyOffer] = useState(false);
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
      return;
    }

    setPassword("");
    setSuccessMessage("Connexion réussie.");
    finishPasswordSignIn(result.passkeyOffer);
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

    if (!email.trim() || !password) {
      setErrorMessage("Veuillez renseigner votre email et votre mot de passe.");
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

    if (!newPassword) {
      setErrorMessage("Veuillez renseigner votre nouveau mot de passe.");
      return;
    }

    const ruleError = checkNewPassword(newPassword);
    if (ruleError) {
      setPasswordError(ruleError);
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
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
    email, setEmail, password, setPassword, isPasswordChange, newPassword, setNewPassword: (value: string) => { setPasswordError(""); setNewPassword(value); }, passwordError, newPasswordConfirmation, setNewPasswordConfirmation,
    isLoading, errorMessage, errorDescription, successMessage, isTwoFactor, isTwoFactorSetup, setupPolicy, isPasskeyOffer,
    dismissError: () => { setErrorMessage(""); setErrorDescription(""); },
    completeTwoFactor: redirectAfterLogin,
    completePasswordSecondStep: finishPasswordSignIn,
    finishPasskeyOffer: redirectAfterLogin,
    restartAfterExpiredSession,
    backToCredentials: () => { setIsTwoFactor(false); setIsTwoFactorSetup(false); },
    onSubmit: isPasswordChange ? handlePasswordChange : handleLogin,
  };
}
