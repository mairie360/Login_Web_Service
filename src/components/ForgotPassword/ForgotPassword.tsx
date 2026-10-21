"use client";

import { FormEvent, useRef, useState } from "react";
import { RECOVERY_EMAIL_PATTERN, RECOVERY_SENT_MESSAGE } from '../../lib/password-recovery-validation';
import RecoveryLayout, { recoveryInputClass, recoveryButtonClass, recoveryLinkClass } from '../RecoveryLayout';

export default function ForgotPassword({ redirectUrl }: { redirectUrl?: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || sent) return;
    setError("");
    if (!RECOVERY_EMAIL_PATTERN.test(email.trim()) || email.trim().length > 320) { setError("Veuillez renseigner une adresse email valide."); return; }
    submitting.current = true; setPending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }), credentials: "same-origin", cache: "no-store", referrerPolicy: "no-referrer",
      });
      const result = await response.json();
      if (!response.ok || result?.success !== true) {
        setError(response.status === 429 ? "Trop de demandes. Veuillez réessayer plus tard." : "La demande n’a pas pu être envoyée. Veuillez réessayer."); return;
      }
      setSent(true); setEmail("");
    } catch { setError("Impossible de joindre le service de récupération. Veuillez réessayer."); }
    finally { submitting.current = false; setPending(false); }
  }
  return <RecoveryLayout>
    <h1 className="mb-4 text-2xl font-bold text-[var(--mairie-text)]">Mot de passe oublié</h1>
    <p className="mb-4 text-sm">Indiquez votre email professionnel pour recevoir un lien de réinitialisation.</p>
    <form method="post" aria-busy={pending} onSubmit={submit} className="flex flex-col gap-4">
      <label htmlFor="recovery-email">Email professionnel</label>
      <input id="recovery-email" name="email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={event => setEmail(event.target.value)} disabled={pending || sent} className={recoveryInputClass} />
      {error && <p role="alert" className="text-sm text-[var(--mairie-error-text)]">{error}</p>}
      {sent && <p role="status" className="text-sm text-[var(--mairie-success-text)]">{RECOVERY_SENT_MESSAGE}</p>}
      <button type="submit" disabled={pending || sent} className={recoveryButtonClass}>{pending ? "Envoi…" : "Envoyer le lien"}</button>
      <a href={redirectUrl ? `/?redirect=${encodeURIComponent(redirectUrl)}` : "/"} className={recoveryLinkClass}>Retour à la connexion</a>
    </form>
  </RecoveryLayout>;
}
