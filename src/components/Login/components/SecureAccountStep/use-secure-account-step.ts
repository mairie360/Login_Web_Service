'use client';

import { FormEvent, useEffect, useRef, useState } from "react";
import { attestationToJson, creationOptionsFromJson, isCancellation, isWebAuthnSupported } from "../PasskeySignIn";
import type { AuthenticatorEnrolment, EnrolmentAlert } from "./components/AuthenticatorSetup";

/** What the administrator allows, relayed by the sign-in route. Missing: the application, which every instance supports. */
export type SetupPolicy = { totp: boolean; passkey: boolean; backupCodes: boolean };
export type SecureAccountMethod = "app" | "passkey";
export type SecureAccountStage = "choice" | "app" | "codes" | "secured" | "passkey" | "passkey-unsupported";

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

type PasskeyOptionsResponse = { options?: Record<string, unknown>; message?: string; reason?: string; restartLogin?: boolean; retryAfter?: number };
type PasskeySetupResponse = { message?: string; reason?: string; restartLogin?: boolean; retryAfter?: number };

const PASSKEY_FAILED = "La création de la passkey a échoué. Veuillez réessayer.";

const DEFAULT_POLICY: SetupPolicy = { totp: true, passkey: false, backupCodes: true };

/** Refusals of the two passkey routes: the French message of the route, or one chosen by status. */
function failureAlert(status: number, body: { message?: string; reason?: string; retryAfter?: number }): EnrolmentAlert {
  if (status === 429) {
    const seconds = body.retryAfter ?? DEFAULT_RETRY_SECONDS;
    return { title: TOO_MANY_ATTEMPTS, description: `Réessayez dans ${seconds} seconde${seconds > 1 ? "s" : ""}.` };
  }
  if (body.reason === "refused") return { title: "La passkey n’a pas pu être vérifiée.", description: "Recommencez la création de la passkey." };
  return { title: body.message ?? PASSKEY_FAILED };
}

/** Mandatory enrolment of a second factor, F7 of the Login mockup: choice → application → backup codes → secured. */
export function useSecureAccountStep({ policy = DEFAULT_POLICY, onSuccess, onSessionOver }: SecureAccountOptions) {
  // A browser that cannot create a passkey is not offered one: the application stays, or the agent is told (F7, case 3).
  const passkeyUsable = policy.passkey && isWebAuthnSupported();
  const both = policy.totp && passkeyUsable;
  const passkeyStage: SecureAccountStage = passkeyUsable ? "passkey" : "passkey-unsupported";
  const firstStage: SecureAccountStage = both ? "choice" : policy.totp ? "app" : passkeyStage;
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
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState("");
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
    setStage(method === "app" ? "app" : "passkey");
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

  const createPasskey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    setAlert(null);
    const name = label.trim();
    if (!name) {
      setLabelError("Donnez un nom à votre passkey.");
      return;
    }
    setLabelError("");
    pending.current = true;
    setIsSubmitting(true);
    try {
      const optionsResponse = await fetch("/api/auth/passkey/setup/options", { method: "POST", headers: { Accept: "application/json" } });
      const started = (await optionsResponse.json().catch(() => ({}))) as PasskeyOptionsResponse;
      if (!optionsResponse.ok || !started.options) {
        if (started.restartLogin) return onSessionOver();
        setAlert(failureAlert(optionsResponse.status, started));
        return;
      }
      const credential = (await navigator.credentials.create({ publicKey: creationOptionsFromJson(started.options) })) as PublicKeyCredential | null;
      // The browser window was closed (« Annuler »): back to the name, with no error.
      if (!credential) return;
      const response = await fetch("/api/auth/passkey/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: name, credential: attestationToJson(credential) }),
      });
      if (response.ok) {
        setStage("secured");
        return;
      }
      const result = (await response.json().catch(() => ({}))) as PasskeySetupResponse;
      if (result.restartLogin) return onSessionOver();
      setAlert(failureAlert(response.status, result));
    } catch (cause) {
      if (isCancellation(cause)) return;
      setAlert({ title: cause instanceof TypeError ? "Impossible de joindre le service de connexion." : PASSKEY_FAILED });
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
    passkeyUsable,
    stage, method, setMethod, onChoose: chooseMethod,
    showSteps: policy.backupCodes,
    enrolment, isStarting, code, setCode: changeCode, fieldError, alert, dismissAlert: () => setAlert(null),
    isSubmitting, locked, onConfirm: confirm,
    backupCodes, acknowledged, acknowledgeError,
    setAcknowledged: (checked: boolean) => { setAcknowledged(checked); setAcknowledgeError(""); },
    onFinish: finish,
    label, setLabel: (value: string) => { setLabel(value); setLabelError(""); }, labelError, onCreatePasskey: createPasskey,
    hasChoice: both,
    backToChoice: () => setStage("choice"),
  };
}
