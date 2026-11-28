"use client";

import { FormEvent, useRef, useState } from "react";
import { emailFieldError, focusField, RECOVERY_SENT_MESSAGE, RECOVERY_SENT_TITLE } from '../../lib/password-recovery-validation';
import { BackButton, Body, Button, EmailField, ErrorAlert, PageTitle, SuccessAlert } from '@mairie360/lib-components/primitives';
import RecoveryLayout from '../RecoveryLayout';

export default function ForgotPassword({ redirectUrl, initialEmail = "" }: { redirectUrl?: string; initialEmail?: string }) {
  // MAIR-773: « Ce n’était pas moi » of the unusual-activity screen opens this page with the e-mail prefilled.
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || sent) return;
    setError("");
    // MAIR-1261: the mock-up shows the e-mail rule under the field (F3 Cas 1), not as a page alert.
    const fieldError = emailFieldError(email);
    setEmailError(fieldError);
    if (fieldError) { focusField(event.currentTarget, "recovery-email"); return; }
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
    <PageTitle>Mot de passe oublié</PageTitle>
    <Body>Indiquez votre email professionnel pour recevoir un lien de réinitialisation.</Body>
    <form method="post" noValidate aria-busy={pending} onSubmit={submit} className="flex flex-col gap-4">
      <EmailField id="recovery-email" name="email" label="Email professionnel" placeholder="prenom.nom@mairie.fr" autoComplete="username" required maxLength={320} value={email} error={emailError || undefined}
        onChange={event => { setEmail(event.target.value); if (emailError) setEmailError(""); }} disabled={pending || sent} />
      {error && <ErrorAlert title={error} onDismiss={() => setError("")} />}
      {sent && <SuccessAlert title={RECOVERY_SENT_TITLE} description={RECOVERY_SENT_MESSAGE} />}
      <Button type="submit" label={pending ? "Envoi…" : "Envoyer le lien"} loading={pending} disabled={pending || sent} fullWidth />
      <BackButton label="Retour à la connexion" href={redirectUrl ? `/?redirect=${encodeURIComponent(redirectUrl)}` : "/"} />
    </form>
  </RecoveryLayout>;
}
