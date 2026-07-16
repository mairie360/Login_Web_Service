"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@mairie360/lib-components";
import { FormEvent, useState } from "react";

type LoginResponse = {
  success?: boolean;
  message?: string;
  requiresPasswordChange?: boolean;
  restartLogin?: boolean;
};

const inputClassName =
  "block w-full rounded-md border border-gray-300 bg-white p-2 text-sm !text-gray-700 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-[#1256A6] focus:ring-2 focus:ring-[#1256A6]/20";

type LoginProps = {
  redirectUrl?: string;
};

export default function Login({ redirectUrl }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordChange, setIsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const redirectAfterLogin = () => {
    if (redirectUrl) {
      window.location.assign(redirectUrl);
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
        device_info: navigator.platform
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
    setErrorMessage("");
    setSuccessMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Veuillez renseigner votre email et votre mot de passe.");
      return;
    }

    setIsLoading(true);

    try {
      await loginWithPassword(password);
    } catch {
      setErrorMessage("Impossible de joindre le service de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      setErrorMessage("Impossible de joindre le service de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#F5F3F0]">
      <Image
        src="/logo.png"
        alt="Logo"
        width={400}
        height={104}
        className="mt-[7.5rem] mb-4"
        priority
      />

      <form
        onSubmit={isPasswordChange ? handlePasswordChange : handleLogin}
        className="flex flex-col items-start gap-4 w-full max-w-md p-6 rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_20px_25px_-5px_rgba(0,0,0,0.10),0_8px_10px_-6px_rgba(0,0,0,0.10)] [&_input]:!my-0 [&_*]:!mb-0"
      >
        <h2 className="text-2xl font-bold text-gray-900 !mb-2">
          {isPasswordChange ? "Nouveau mot de passe" : "Connexion"}
        </h2>
        {isPasswordChange ? (
          <>
            <p className="text-sm leading-5 text-gray-600">
              Pour finaliser votre première connexion, choisissez un nouveau
              mot de passe.
            </p>
            <div className="w-full flex flex-col gap-1">
              <label
                htmlFor="new-password"
                className="text-sm text-gray-500"
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
                required
                className={inputClassName}
              />
            </div>
            <div className="w-full flex flex-col gap-1">
              <label
                htmlFor="new-password-confirmation"
                className="text-sm text-gray-500"
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
                required
                className={inputClassName}
              />
            </div>
          </>
        ) : (
          <>
            <div className="w-full flex flex-col gap-1 text-black">
              <label htmlFor="email" className="text-sm text-gray-500">
                Email professionnel
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="exemple@domaine.com"
                required
                className={inputClassName}
              />
            </div>
            <div className="w-full flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-sm text-gray-500">
                  Mot de passe
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#4B908D] hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className={inputClassName}
              />
            </div>
          </>
        )}
        {errorMessage && (
          <p
            role="alert"
            className="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p
            role="status"
            className="w-full rounded-md bg-green-50 px-3 py-2 text-sm text-green-700"
          >
            {successMessage}
          </p>
        )}
        <div className="w-full [&>button]:flex [&>button]:w-full [&>button]:py-[9px] [&>button]:pb-[11px] [&>button]:px-0 [&>button]:justify-center [&>button]:items-center [&>button]:self-stretch [&>button]:rounded-md [&>button]:bg-[#1256A6] [&>button]:shadow-[0_10px_15px_-3px_rgba(18,86,166,0.30),0_4px_6px_-4px_rgba(18,86,166,0.30)] [&>button]:hover:bg-[#0e4785] [&>button:disabled]:cursor-not-allowed [&>button:disabled]:opacity-60">
          <Button
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
      </form>
      <p className="mt-6 text-sm text-gray-500">
        © 2026 Mairie360. Tous droits réservés.
      </p>
    </div>
  );
}
