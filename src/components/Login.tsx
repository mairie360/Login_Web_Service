"use client";

import Image from "next/image";
import { CredentialsFields } from "./login/CredentialsFields";
import { LoginFeedback } from "./login/LoginFeedback";
import { LoginSubmit } from "./login/LoginSubmit";
import { PasswordChangeFields } from "./login/PasswordChangeFields";
import { SingleAccountLink } from "./login/SingleAccountLink";
import { FormEvent, useEffect, useRef, useState } from "react";

type LoginResponse = {
  success?: boolean;
  message?: string;
  requiresPasswordChange?: boolean;
  restartLogin?: boolean;
};

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordChange, setIsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(resumeSession && redirectUrl));
  const [isResuming, setIsResuming] = useState(Boolean(resumeSession && redirectUrl));
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [successMessage, setSuccessMessage] = useState("");
  const submissionPending = useRef(Boolean(resumeSession && redirectUrl));
  const resumeRequest = useRef<{ target: string; result: Promise<{ status: number; valid: boolean }> } | null>(null);

  useEffect(() => {
    if (!resumeSession || !redirectUrl) return;
    let active = true;
    submissionPending.current = true;
    if (!resumeRequest.current || resumeRequest.current.target !== redirectUrl) {
      // A Strict Mode effect replay observes the same request. The owner reads
      // its scoped HttpOnly cookie; no credential is passed through the page.
      const result = fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "manual",
        body: "{}",
      }).then(async response => {
        const body: unknown = await response.json().catch(() => null);
        return {
          status: response.status,
          valid: response.status === 200 && typeof body === "object" && body !== null &&
            "message" in body && typeof body.message === "string" && Boolean(body.message.trim()),
        };
      }).catch(() => ({ status: 0, valid: false }));
      resumeRequest.current = { target: redirectUrl, result };
    }
    void resumeRequest.current.result.then(result => {
      if (!active) return;
      if (result.valid) {
        try { navigate(redirectUrl); return; } catch { /* Keep sign-in available if navigation fails. */ }
      }
      setErrorMessage(result.status === 401
        ? "Votre session a expiré. Veuillez vous reconnecter."
        : "La reprise de votre session est temporairement indisponible. Vous pouvez vous connecter à nouveau.");
      submissionPending.current = false;
      setIsLoading(false);
      setIsResuming(false);
    });
    return () => { active = false; };
  }, [resumeSession, redirectUrl, navigate]);

  const redirectAfterLogin = () => {
    if (redirectUrl) {
      navigate(redirectUrl);
    }
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
    redirectAfterLogin();
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionPending.current) return;
    setErrorMessage("");
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
    setErrorMessage("");
    setSuccessMessage("");

    if (!newPassword) {
      setErrorMessage("Veuillez renseigner votre nouveau mot de passe.");
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
        // method="post" : si le JavaScript n'est pas exécuté (robot, JS désactivé),
        // une soumission native ne doit jamais placer les identifiants dans l'URL.
        method="post"
        aria-busy={isLoading}
        onSubmit={isPasswordChange ? handlePasswordChange : handleLogin}
        className="flex flex-col items-start gap-4 w-full max-w-md p-6 rounded-2xl border border-[var(--mairie-border)] bg-[var(--mairie-surface)] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.10),0_8px_10px_-6px_rgba(0,0,0,0.10)] [&_input]:!my-0 [&_*]:!mb-0"
      >
        <h1 className="text-2xl font-bold text-[var(--mairie-text)] !mb-2">
          {isPasswordChange ? "Nouveau mot de passe" : "Connexion"}
        </h1>
        {isPasswordChange ? (
          <PasswordChangeFields
            password={newPassword}
            confirmation={newPasswordConfirmation}
            disabled={isLoading}
            onPasswordChange={setNewPassword}
            onConfirmationChange={setNewPasswordConfirmation}
          />
        ) : (
          <CredentialsFields email={email} password={password} disabled={isLoading} onEmailChange={setEmail} onPasswordChange={setPassword} />
        )}
        {!isPasswordChange && <a href={redirectUrl ? `/forgot-password?redirect=${encodeURIComponent(redirectUrl)}` : "/forgot-password"} className="text-sm text-[var(--mairie-accent)] underline focus-visible:outline-2 focus-visible:outline-offset-2">Mot de passe oublié ?</a>}
        <LoginFeedback resuming={isResuming} error={errorMessage} success={successMessage} onDismissError={() => setErrorMessage("")} />
        <LoginSubmit loading={isLoading} passwordChange={isPasswordChange} />
        {keycloakLoginUrl && !isPasswordChange && <SingleAccountLink href={keycloakLoginUrl} disabled={isLoading} />}
      </form>
    </div>
  );
}
