"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { RESET_TOKEN_PATTERN, RESET_EXPIRED_MESSAGE } from '../../lib/password-recovery-validation';
import RecoveryLayout, { recoveryInputClass, recoveryButtonClass, recoveryLinkClass } from '../RecoveryLayout';

const navigateToFront = (url: string) => window.location.assign(url);
type Props = { token?: string; redirectUrl?: string; navigate?: (url: string) => void };

function ResetPasswordForm({ token, redirectUrl, navigate = navigateToFront }: Props) {
  const validToken = Boolean(token && RESET_TOKEN_PATTERN.test(token));
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const mounted = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; activeRequest.current?.abort(); };
  }, []);
  useEffect(() => {
    // Remove the one-time token from browser history before any form submission/navigation.
    const url = new URL(window.location.href);
    if (url.searchParams.has("token")) {
      url.searchParams.delete("token");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, []);
  const recoveryUrl = redirectUrl ? `/forgot-password?redirect=${encodeURIComponent(redirectUrl)}` : "/forgot-password";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !validToken || expired || complete) return;
    setError("");
    if (password.length < 8 || password.length > 255) { setError("Le mot de passe doit contenir entre 8 et 255 caractères."); return; }
    if (password !== confirmation) { setError("Les mots de passe ne correspondent pas."); return; }
    submitting.current = true; setPending(true);
    const request = new AbortController();
    activeRequest.current = request;
    const current = () => mounted.current && !request.signal.aborted && activeRequest.current === request;
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword: password }), credentials: "same-origin", cache: "no-store", referrerPolicy: "no-referrer", signal: request.signal,
      });
      const result = await response.json();
      if (!current()) return;
      if (!response.ok || result?.success !== true) {
        if (response.status === 401 || response.status === 403) { setExpired(true); setPassword(""); setConfirmation(""); }
        else setError(response.status === 429 ? "Trop de demandes. Veuillez réessayer plus tard." : "Le mot de passe n’a pas pu être modifié. Veuillez réessayer.");
        return;
      }
      setComplete(true); setPassword(""); setConfirmation("");
      if (redirectUrl) navigate(redirectUrl);
    } catch { if (current()) setError("Impossible de joindre le service de récupération. Veuillez réessayer."); }
    finally { if (current()) { submitting.current = false; setPending(false); } }
  }
  return <RecoveryLayout>
    <h1 className="mb-4 text-2xl font-bold text-[var(--mairie-text)]">Réinitialiser le mot de passe</h1>
    {!validToken || expired ? <>
      <p role="alert" className="mb-4 text-sm text-[var(--mairie-error-text)]">{RESET_EXPIRED_MESSAGE}</p>
      <a href={recoveryUrl} className={recoveryLinkClass}>Demander un nouveau lien</a>
    </> : <form method="post" aria-busy={pending} onSubmit={submit} className="flex flex-col gap-4">
      <p id="password-requirements" className="text-sm">Choisissez un mot de passe de 8 à 255 caractères.</p>
      <label htmlFor="reset-password">Nouveau mot de passe</label>
      <input id="reset-password" name="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={255} aria-describedby="password-requirements" value={password} onChange={event => setPassword(event.target.value)} disabled={pending || complete} className={recoveryInputClass} />
      <label htmlFor="reset-confirmation">Confirmer le mot de passe</label>
      <input id="reset-confirmation" name="password-confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={255} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={pending || complete} className={recoveryInputClass} />
      {error && <p role="alert" className="text-sm text-[var(--mairie-error-text)]">{error}</p>}
      {complete && <p role="status" className="text-sm text-[var(--mairie-success-text)]">Mot de passe modifié. Vous êtes connecté.</p>}
      <button type="submit" disabled={pending || complete} className={recoveryButtonClass}>{pending ? "Modification…" : "Modifier le mot de passe"}</button>
      <a href={recoveryUrl} className={recoveryLinkClass}>Demander un nouveau lien</a>
    </form>}
  </RecoveryLayout>;
}

export default function ResetPassword(props: Props) {
  return <ResetPasswordForm key={`${props.token ?? 'missing'}:${props.redirectUrl ?? ''}`} {...props} />;
}
