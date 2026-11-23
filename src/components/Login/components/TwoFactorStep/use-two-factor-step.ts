'use client';

import { FormEvent, useEffect, useRef, useState } from "react";

export type SecondStepMode = "totp" | "recovery";

type Alert = { title: string; description?: string };

type SecondStepResponse = {
  message?: string;
  reason?: "wrong-code" | "spent-backup-code";
  restartLogin?: boolean;
  retryAfter?: number;
  /** MAIR-811: whether to propose a passkey once the session is open. */
  passkeyOffer?: { allowed: boolean; registered: boolean };
};

export type SecondStepOptions = {
  /** The session is open: the sign-in is over (with the passkey offer of the sign-in, MAIR-811). */
  onSuccess: (passkeyOffer?: { allowed: boolean; registered: boolean }) => void;
  /** The login token is over (expired, or burnt by five wrong codes): back to the password. */
  onSessionOver: () => void;
};

// Without a Retry-After the BFF still refuses: wait the shortest delay Core announces.
const DEFAULT_RETRY_SECONDS = 30;
const TOO_MANY_ATTEMPTS = "Trop de tentatives.";
const TOTP_LENGTH = 6;
const RECOVERY_LENGTH = 9;

const wrongCodeAlert = (mode: SecondStepMode): Alert =>
  mode === "totp"
    ? { title: "Code incorrect.", description: "Vérifiez que l’heure de votre téléphone est juste, puis saisissez le nouveau code." }
    : { title: "Code incorrect.", description: "Vérifiez le code de secours saisi, puis réessayez." };

const incompleteCodeError = (mode: SecondStepMode) =>
  mode === "totp" ? "Saisissez le code à 6 chiffres." : "Saisissez un code de secours (XXXX-XXXX).";

/** Second step of the sign-in: the code of the authenticator application, or a backup code. */
export function useTwoFactorStep({ onSuccess, onSessionOver }: SecondStepOptions) {
  const [mode, setModeState] = useState<SecondStepMode>("totp");
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [alert, setAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const pending = useRef(false);

  const locked = secondsLeft > 0;

  // One tick per second; the alert of a 429 ends with its delay.
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => {
      if (secondsLeft === 1) setAlert((current) => (current?.title === TOO_MANY_ATTEMPTS ? null : current));
      setSecondsLeft(secondsLeft - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const setMode = (next: SecondStepMode) => {
    setModeState(next);
    setCode("");
    setFieldError("");
    setAlert(null);
  };

  const changeCode = (value: string) => {
    setCode(value);
    setFieldError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || locked) return;
    setAlert(null);

    const expected = mode === "totp" ? TOTP_LENGTH : RECOVERY_LENGTH;
    if (code.length !== expected) {
      setFieldError(incompleteCodeError(mode));
      return;
    }
    setFieldError("");

    pending.current = true;
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = (await response.json()) as SecondStepResponse;

      if (response.ok) {
        onSuccess(result.passkeyOffer);
        return;
      }
      if (result.restartLogin) {
        onSessionOver();
        return;
      }
      if (response.status === 429) {
        const seconds = result.retryAfter ?? DEFAULT_RETRY_SECONDS;
        setAlert({ title: TOO_MANY_ATTEMPTS, description: `Réessayez dans ${seconds} seconde${seconds > 1 ? "s" : ""}. Le champ se réactive à la fin du délai.` });
        setSecondsLeft(seconds);
        return;
      }
      if (response.status === 401) {
        setAlert(result.reason === "spent-backup-code"
          ? { title: "Ce code de secours a déjà été utilisé.", description: "Utilisez un autre code de secours." }
          : wrongCodeAlert(mode));
        return;
      }
      setAlert({ title: result.message ?? "La connexion a échoué." });
    } catch {
      setAlert({ title: "Impossible de joindre le service de connexion." });
    } finally {
      pending.current = false;
      setIsLoading(false);
    }
  };

  return {
    mode, setMode, code, setCode: changeCode, fieldError, alert, dismissAlert: () => setAlert(null),
    isLoading, locked, onSubmit: submit,
  };
}
