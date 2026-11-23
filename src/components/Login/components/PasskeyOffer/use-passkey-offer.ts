'use client';

import { FormEvent, useEffect, useRef, useState } from "react";
import { attestationToJson, creationOptionsFromJson, isCancellation } from "../PasskeySignIn";
import { canCreateAutomatically, dismissPasskeyOffer } from "./offer-preference";

export type PasskeyOfferStage = "automatic" | "offer" | "saved";
export type PasskeyOfferAlert = { title: string; description?: string };

type OptionsResponse = { options?: Record<string, unknown>; message?: string; reason?: string };
type RegisteredResponse = { id?: number; label?: string; provider?: string | null; message?: string; reason?: string };

/** Name given at the creation, before the agent chooses one on « Passkey enregistrée » (kept if the tab is closed). */
export const PROVISIONAL_LABEL = "Passkey Mairie 360";
/** The browser may keep a conditional creation pending: past this delay the screen proposes the passkey instead. */
const AUTOMATIC_TIMEOUT_MS = 5_000;
const CREATION_FAILED = "La création de la passkey a échoué. Veuillez réessayer.";
const UNREACHABLE = "Impossible de joindre le service de connexion.";

function failure(status: number, body: { message?: string; reason?: string }): PasskeyOfferAlert {
  if (body.reason === "refused") return { title: "La passkey n’a pas pu être vérifiée.", description: "Recommencez la création de la passkey." };
  if (body.reason === "session") return { title: "Votre session a expiré.", description: "Vous pourrez créer une passkey dans Paramètres, rubrique Sécurité." };
  return { title: body.message ?? (status >= 500 ? "Le service de connexion est indisponible. Veuillez réessayer." : CREATION_FAILED) };
}

/** Challenge, browser ceremony, then registration under the provisional name. `null` when the agent closed the window. */
async function createPasskey(mediation?: CredentialMediationRequirement, signal?: AbortSignal) {
  const optionsResponse = await fetch("/api/passkeys/options", { method: "POST", headers: { Accept: "application/json" } });
  const started = (await optionsResponse.json().catch(() => ({}))) as OptionsResponse;
  if (!optionsResponse.ok || !started.options) return { alert: failure(optionsResponse.status, started) };
  const credential = (await navigator.credentials.create({
    publicKey: creationOptionsFromJson(started.options),
    ...(mediation ? { mediation } : {}),
    ...(signal ? { signal } : {}),
  } as CredentialCreationOptions)) as PublicKeyCredential | null;
  if (!credential) return null;
  const response = await fetch("/api/passkeys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label: PROVISIONAL_LABEL, credential: attestationToJson(credential) }),
  });
  const result = (await response.json().catch(() => ({}))) as RegisteredResponse;
  if (!response.ok || typeof result.id !== "number") return { alert: failure(response.status, result) };
  return { stored: { id: result.id, provider: result.provider ?? null } };
}

/** Saves the name the agent keeps; the provisional one stays when nothing is chosen. */
async function renamePasskey(id: number, label: string) {
  const response = await fetch("/api/passkeys/name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, label }),
  });
  if (response.ok) return null;
  const result = (await response.json().catch(() => ({}))) as { message?: string; reason?: string };
  return { status: response.status, ...result };
}

/**
 * MAIR-811 F8: after a password sign-in, propose a passkey. The browser that can create one silently (conditional creation,
 * after a saved password) does it first; otherwise, or when it declines, the agent chooses « Créer une passkey », « Plus tard »
 * or « Ne plus me le proposer sur cet appareil ». A created passkey is then named (the manager Core recognised, editable).
 */
export function usePasskeyOffer(onDone: () => void) {
  const [stage, setStage] = useState<PasskeyOfferStage>("automatic");
  const [alert, setAlert] = useState<PasskeyOfferAlert | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [stored, setStored] = useState<{ id: number; provider: string | null } | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const pending = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), AUTOMATIC_TIMEOUT_MS);
    (async () => {
      if (!(await canCreateAutomatically())) {
        if (active) setStage("offer");
        return;
      }
      try {
        const created = await createPasskey("conditional", controller.signal);
        if (!active) return;
        if (created && "stored" in created && created.stored) {
          // Named after its manager when Core recognised it; the provisional name stays otherwise.
          if (created.stored.provider) await renamePasskey(created.stored.id, created.stored.provider).catch(() => null);
          if (active) onDoneRef.current();
          return;
        }
        setStage("offer");
      } catch {
        // Declined, timed out or refused: the agent is asked instead.
        if (active) setStage("offer");
      } finally {
        window.clearTimeout(timer);
      }
    })();
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const create = async () => {
    if (pending.current) return;
    pending.current = true;
    setAlert(null);
    setIsCreating(true);
    try {
      const created = await createPasskey();
      // The browser window was closed: back to the offer, with no error.
      if (!created) return;
      if ("alert" in created && created.alert) {
        setAlert(created.alert);
        return;
      }
      if ("stored" in created && created.stored) {
        setStored(created.stored);
        setName(created.stored.provider ?? "");
        setStage("saved");
      }
    } catch (cause) {
      if (isCancellation(cause)) return;
      setAlert({ title: cause instanceof TypeError ? UNREACHABLE : CREATION_FAILED });
    } finally {
      pending.current = false;
      setIsCreating(false);
    }
  };

  const later = () => onDoneRef.current();

  const neverOnThisDevice = () => {
    dismissPasskeyOffer();
    onDoneRef.current();
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || !stored) return;
    const label = name.trim();
    if (!label) {
      setNameError("Donnez un nom à cette passkey.");
      return;
    }
    setNameError("");
    setAlert(null);
    pending.current = true;
    setIsSaving(true);
    try {
      const refused = await renamePasskey(stored.id, label);
      if (!refused) {
        onDoneRef.current();
        return;
      }
      if (refused.reason === "label") setNameError(refused.message ?? "Donnez un nom à cette passkey.");
      else setAlert({ title: refused.message ?? "Le nom de la passkey n’a pas pu être enregistré." });
    } catch {
      setAlert({ title: UNREACHABLE });
    } finally {
      pending.current = false;
      setIsSaving(false);
    }
  };

  return {
    stage, alert, dismissAlert: () => setAlert(null),
    isCreating, onCreate: create, onLater: later, onNeverOnThisDevice: neverOnThisDevice,
    provider: stored?.provider ?? null, name, setName: (value: string) => { setName(value); setNameError(""); }, nameError, isSaving, onSave: save,
  };
}
