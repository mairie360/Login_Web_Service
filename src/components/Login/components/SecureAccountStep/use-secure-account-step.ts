'use client';

import { FormEvent, useEffect, useRef, useState } from "react";
import type { AuthenticatorEnrolment, EnrolmentAlert } from "./components/AuthenticatorSetup";

/** What the administrator allows, relayed by the sign-in route. Missing: the application, which every instance supports. */
export type SetupPolicy = { totp: boolean; passkey: boolean; backupCodes: boolean };
export type SecureAccountMethod = "app" | "passkey";
export type SecureAccountStage = "choice" | "app" | "codes" | "secured" | "passkey-only";

export type SecureAccountOptions = {
  policy?: SetupPolicy;
  /** The session is open and the codes (if any) are kept: the sign-in is over. */
  onSuccess: () => void;
  /** The enrolment token is over (expired, burnt, or the account got a factor meanwhile): back to the password. */
  onSessionOver: () => void;
};

type StartResponse = { secret?: string; otpauthUri?: string; message?: string; restartLogin?: boolean; retryAfter?: number };
type ConfirmResponse = { backupCodes?: string[]; message?: string; reason?: "wrong-code"; restartLogin?: boolean; retryAfter?: number };

const DEFAULT_RETRY_SECONDS = 30;
const TOO_MANY_ATTEMPTS = "Trop de tentatives.";
const TOTP_LENGTH = 6;
// Short pause on « Compte sécurisé » so the message is read before the module opens.
const SECURED_DELAY_MS = 1500;

const DEFAULT_POLICY: SetupPolicy = { totp: true, passkey: false, backupCodes: true };

/** Mandatory enrolment of a second factor, F7 of the Login mockup: choice → application → backup codes → secured. */
export function useSecureAccountStep({ policy = DEFAULT_POLICY, onSuccess, onSessionOver }: SecureAccountOptions) {
  const both = policy.totp && policy.passkey;
  const firstStage: SecureAccountStage = both ? "choice" : policy.totp ? "app" : "passkey-only";
  const [stage, setStage] = useState<SecureAccountStage>(firstStage);
  const [method, setMethod] = useState<SecureAccountMethod>("app");
  const [enrolment, setEnrolment] = useState<AuthenticatorEnrolment | null>(null);
  // True from the first render when the application is the only method: the secret is being prepared.
  const [isStarting, setIsStarting] = useState(firstStage === "app");
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [alert, setAlert] = useState<EnrolmentAlert | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledgeError, setAcknowledgeError] = useState("");
  const pending = useRef(false);
  const started = useRef(false);
  const locked = secondsLeft > 0;

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => {
      if (secondsLeft === 1) setAlert((current) => (current?.title === TOO_MANY_ATTEMPTS ? null : current));
      setSecondsLeft(secondsLeft - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Starting twice would replace the secret the agent has already scanned: once per enrolment.
  useEffect(() => {
    if (stage !== "app" || started.current) return;
    started.current = true;
    void (async () => {
      try {
        const response = await fetch("/api/auth/2fa/setup", { method: "POST" });
        const result = (await response.json()) as StartResponse;
        if (response.ok && result.secret && result.otpauthUri) {
          setEnrolment({ secret: result.secret, otpauthUri: result.otpauthUri });
          return;
        }
        if (result.restartLogin) {
          onSessionOver();
          return;
        }
        setAlert({ title: result.message ?? "La préparation de l’enrôlement a échoué." });
      } catch {
        setAlert({ title: "Impossible de joindre le service de connexion." });
      } finally {
        setIsStarting(false);
      }
    })();
  }, [stage, onSessionOver]);

  // « Compte sécurisé »: the module opens by itself.
  useEffect(() => {
    if (stage !== "secured") return undefined;
    const timer = setTimeout(onSuccess, SECURED_DELAY_MS);
    return () => clearTimeout(timer);
  }, [stage, onSuccess]);

  const chooseMethod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (method === "app" && !started.current) setIsStarting(true);
    setStage(method === "app" ? "app" : "passkey-only");
  };

  const changeCode = (value: string) => {
    setCode(value);
    setFieldError("");
  };

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || locked) return;
    setAlert(null);
    if (code.length !== TOTP_LENGTH) {
      setFieldError("Saisissez le code à 6 chiffres.");
      return;
    }
    setFieldError("");
    pending.current = true;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = (await response.json()) as ConfirmResponse;
      if (response.ok && Array.isArray(result.backupCodes)) {
        if (policy.backupCodes && result.backupCodes.length > 0) {
          setBackupCodes(result.backupCodes);
          setStage("codes");
        } else {
          setStage("secured");
        }
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
        setAlert({ title: "Code incorrect.", description: "Vérifiez que l’heure de votre téléphone est juste, puis saisissez le nouveau code." });
        return;
      }
      setAlert({ title: result.message ?? "La vérification a échoué." });
    } catch {
      setAlert({ title: "Impossible de joindre le service de connexion." });
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  const finish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!acknowledged) {
      setAcknowledgeError("Confirmez que vous avez enregistré vos codes.");
      return;
    }
    setStage("secured");
  };

  return {
    stage, method, setMethod, onChoose: chooseMethod,
    showSteps: policy.backupCodes,
    enrolment, isStarting, code, setCode: changeCode, fieldError, alert, dismissAlert: () => setAlert(null),
    isSubmitting, locked, onConfirm: confirm,
    backupCodes, acknowledged, acknowledgeError,
    setAcknowledged: (checked: boolean) => { setAcknowledged(checked); setAcknowledgeError(""); },
    onFinish: finish,
    hasChoice: both,
    backToChoice: () => setStage("choice"),
  };
}
