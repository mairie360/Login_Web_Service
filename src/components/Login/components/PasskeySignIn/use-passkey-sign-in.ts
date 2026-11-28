"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { credentialToJson, isCancellation, isConditionalMediationAvailable, isWebAuthnSupported, requestOptionsFromJson } from "./webauthn";

/** `hidden`: the mairie does not accept passkeys; `unavailable`: no relying party on this instance. Without WebAuthn nothing leaves « checking ». */
export type PasskeyAvailability = "checking" | "available" | "hidden" | "unavailable";

type Ceremony = { id: string; options: Record<string, unknown> };
type Started = { ceremony: Ceremony } | { availability: "hidden" | "unavailable" } | { error: string };

const START_FAILED = "La connexion par passkey a échoué. Veuillez réessayer.";

async function startCeremony(): Promise<Started> {
  try {
    const response = await fetch("/api/auth/passkey/options", { method: "POST", headers: { Accept: "application/json" } });
    if (response.status === 403) return { availability: "hidden" };
    if (response.status === 503) return { availability: "unavailable" };
    const body = (await response.json().catch(() => ({}))) as Partial<Ceremony> & { message?: string };
    if (!response.ok || typeof body.id !== "string" || !body.options) return { error: body.message ?? START_FAILED };
    return { ceremony: { id: body.id, options: body.options } };
  } catch {
    return { error: "Impossible de joindre le service de connexion." };
  }
}

/** MAIR-1261: second line of the refusals of the mock-up (F5 « Passkey refusée »), by status of the sign-in route. */
const PASSKEY_ERROR_DESCRIPTIONS: Record<number, string> = {
  401: "Utilisez votre mot de passe ou une autre passkey enregistrée pour Mairie 360.",
  403: "Contactez votre administrateur pour le réactiver.",
  429: "Patientez quelques minutes avant de réessayer.",
};

// Passkey sign-in of the sign-in card (mock-up F5): the button, and the autofill of the e-mail field when the browser has it.
export function usePasskeySignIn(onSuccess: () => void) {
  const [availability, setAvailability] = useState<PasskeyAvailability>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorDescription, setErrorDescription] = useState("");
  const conditional = useRef<AbortController | null>(null);
  const pending = useRef(false);
  // `Login` passes a function recreated on every render: read it through a ref so a keystroke in the e-mail field
  // does not rebuild `finish` and `ask`, which would abort and restart the conditional ceremony.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // The signed answer goes to the front, which opens the session. Returns true once the agent is signed in.
  const finish = useCallback(async (ceremony: Ceremony, credential: PublicKeyCredential) => {
    const response = await fetch("/api/auth/passkey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ceremony.id, credential: credentialToJson(credential) }),
    });
    if (response.ok) {
      onSuccessRef.current();
      return;
    }
    const body = (await response.json().catch(() => ({}))) as { message?: string; reason?: string };
    if (response.status === 503) setAvailability("unavailable");
    else { setError(body.message ?? START_FAILED); setErrorDescription(PASSKEY_ERROR_DESCRIPTIONS[response.status] ?? ""); }
  }, []);

  const ask = useCallback(async (ceremony: Ceremony, mediation?: CredentialMediationRequirement, signal?: AbortSignal) => {
    const credential = (await navigator.credentials.get({ publicKey: requestOptionsFromJson(ceremony.options), ...(mediation ? { mediation } : {}), ...(signal ? { signal } : {}) })) as PublicKeyCredential | null;
    if (credential) await finish(ceremony, credential);
  }, [finish]);

  useEffect(() => {
    // Without WebAuthn the state stays « checking », which shows nothing, like « hidden ».
    if (!isWebAuthnSupported()) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      const started = await startCeremony();
      if (cancelled) return;
      if ("availability" in started) return setAvailability(started.availability);
      setAvailability("available");
      if ("error" in started || !(await isConditionalMediationAvailable()) || cancelled) return;
      conditional.current = controller;
      try {
        await ask(started.ceremony, "conditional", controller.signal);
      } catch (cause) {
        if (!isCancellation(cause)) { setError(START_FAILED); setErrorDescription(""); }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ask]);

  const signIn = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setError(""); setErrorDescription("");
    setBusy(true);
    conditional.current?.abort();
    try {
      const started = await startCeremony();
      if ("availability" in started) return setAvailability(started.availability);
      if ("error" in started) { setErrorDescription(""); return setError(started.error); }
      await ask(started.ceremony);
    } catch (cause) {
      if (!isCancellation(cause)) { setError(START_FAILED); setErrorDescription(""); }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, [ask]);

  return { availability, busy, error, errorDescription, signIn, dismissError: () => { setError(""); setErrorDescription(""); } };
}
