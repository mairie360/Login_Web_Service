"use client";

import Image from "next/image";
import { Button, Toast } from "@mairie360/lib-components/primitives";
import { FormEvent, useEffect, useRef, useState } from "react";

type LoginResponse = {
  success?: boolean;
  message?: string;
  requiresPasswordChange?: boolean;
  restartLogin?: boolean;
};

const inputClassName =
  "block w-full rounded-md border border-[var(--mairie-control-border)] bg-[var(--mairie-surface)] p-2 text-sm text-[var(--mairie-text)] placeholder:text-gray-400 shadow-sm outline-none transition focus:border-[var(--mairie-accent)] focus:ring-2 focus:ring-[var(--mairie-accent)]/20";

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
          <>
            <p className="text-sm leading-5 text-[var(--mairie-muted)]">
              Pour finaliser votre première connexion, choisissez un nouveau
              mot de passe.
            </p>
            <div className="w-full flex flex-col gap-1">
              <label
                htmlFor="new-password"
                className="text-sm text-[var(--mairie-muted)]"
              >
                Nouveau mot de passe
              </label>
              <input
                id="new-password"
                name="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                disabled={isLoading}
                required
                className={inputClassName}
              />
            </div>
            <div className="w-full flex flex-col gap-1">
              <label
                htmlFor="new-password-confirmation"
                className="text-sm text-[var(--mairie-muted)]"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="new-password-confirmation"
                name="new-password-confirmation"
                type="password"
                value={newPasswordConfirmation}
                onChange={(event) =>
                  setNewPasswordConfirmation(event.target.value)
                }
                autoComplete="new-password"
                disabled={isLoading}
                required
                className={inputClassName}
              />
            </div>
          </>
        ) : (
          <>
            <div className="w-full flex flex-col gap-1 text-[var(--mairie-text)]">
              <label htmlFor="email" className="text-sm text-[var(--mairie-muted)]">
                Email professionnel
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={isLoading}
                placeholder="exemple@domaine.com"
                required
                className={inputClassName}
              />
            </div>
            <div className="w-full flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm text-[var(--mairie-muted)]">
                  Mot de passe
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
                required
                className={inputClassName}
              />
            </div>
          </>
        )}
        {!isPasswordChange && <a href={redirectUrl ? `/forgot-password?redirect=${encodeURIComponent(redirectUrl)}` : "/forgot-password"} className="text-sm text-[var(--mairie-accent)] underline focus-visible:outline-2 focus-visible:outline-offset-2">Mot de passe oublié ?</a>}
        {isResuming && <p role="status" className="text-sm leading-5 text-[var(--mairie-muted)]">Reprise de votre session…</p>}
        {errorMessage && (
          <Toast variant="error" message={errorMessage} onClose={() => setErrorMessage("")} className="w-full" />
        )}
        {successMessage && (
          <p
            role="status"
            className="w-full rounded-md bg-[var(--mairie-success-surface)] px-3 py-2 text-sm text-[var(--mairie-success-text)]"
          >
            {successMessage}
          </p>
        )}
        <div className="w-full [&>button]:flex [&>button]:w-full [&>button]:py-[9px] [&>button]:pb-[11px] [&>button]:px-0 [&>button]:justify-center [&>button]:items-center [&>button]:self-stretch [&>button]:rounded-md [&>button]:bg-[var(--mairie-action-background)] [&>button]:shadow-[0_10px_15px_-3px_rgba(18,86,166,0.30),0_4px_6px_-4px_rgba(18,86,166,0.30)] [&>button]:hover:bg-[var(--mairie-action-hover-background)] [&>button:disabled]:cursor-not-allowed [&>button:disabled]:opacity-60">
          <Button
            className="!text-white"
            label={
              isLoading
                ? isPasswordChange
                  ? "Modification…"
                  : "Connexion…"
                : isPasswordChange
                  ? "Modifier le mot de passe"
                  : "Se connecter"
            }
            type="submit"
            disabled={isLoading}
            primary
          />
        </div>
        {keycloakLoginUrl && !isPasswordChange && (
          <>
            <p aria-hidden="true" className="flex w-full items-center gap-3 text-sm text-[var(--mairie-muted)] before:h-px before:flex-1 before:bg-[var(--mairie-border)] after:h-px after:flex-1 after:bg-[var(--mairie-border)]">ou</p>
            <a
              href={keycloakLoginUrl}
              aria-disabled={isLoading || undefined}
              onClick={(event) => { if (isLoading) event.preventDefault(); }}
              className="flex w-full justify-center rounded-md border border-[var(--mairie-control-border)] bg-[var(--mairie-surface)] px-3 py-2 text-sm font-semibold text-[var(--mairie-accent)] shadow-sm transition hover:bg-[var(--mairie-background)] focus-visible:outline-2 focus-visible:outline-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
            >
              Se connecter avec le compte unique
            </a>
          </>
        )}
      </form>
    </div>
  );
}
