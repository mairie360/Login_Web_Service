"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { RESET_TOKEN_PATTERN, RESET_EXPIRED_MESSAGE } from '../../lib/password-recovery-validation';
import { checkNewPassword } from '@mairie360/lib-components/shared';
import { BackButton, Body, Button, ErrorAlert, LinkButton, NewPasswordField, PageTitle, PasswordField, SuccessAlert } from '@mairie360/lib-components/primitives';
import RecoveryLayout from '../RecoveryLayout';

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
    const ruleError = checkNewPassword(password);
    if (ruleError || password.length > 255) { setError(ruleError ?? "Le mot de passe ne doit pas dépasser 255 caractères."); return; }
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
  const loginUrl = redirectUrl ? `/?redirect=${encodeURIComponent(redirectUrl)}` : "/";
  return <RecoveryLayout>
    <PageTitle>Réinitialiser le mot de passe</PageTitle>
    {!validToken || expired ? <>
      <ErrorAlert title={RESET_EXPIRED_MESSAGE} />
      <Button label="Demander un nouveau lien" href={recoveryUrl} fullWidth />
      <BackButton label="Retour à la connexion" href={loginUrl} />
    </> : <form method="post" aria-busy={pending} onSubmit={submit} className="flex flex-col gap-4">
      <Body>Choisissez un mot de passe d’au moins 12 caractères, avec des chiffres et des lettres.</Body>
      <NewPasswordField id="reset-password" name="new-password" required maxLength={255} value={password} onChange={event => setPassword(event.target.value)} disabled={pending || complete} />
      <PasswordField id="reset-confirmation" name="password-confirmation" label="Confirmer le mot de passe" autoComplete="new-password" required maxLength={255} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={pending || complete} />
      {error && <ErrorAlert title={error} onDismiss={() => setError("")} />}
      {complete && <SuccessAlert title="Mot de passe modifié. Vous êtes connecté." />}
      <Button type="submit" label={pending ? "Modification…" : "Modifier le mot de passe"} loading={pending} disabled={pending || complete} fullWidth />
      <LinkButton label="Demander un nouveau lien" href={recoveryUrl} />
    </form>}
  </RecoveryLayout>;
}

export default function ResetPassword(props: Props) {
  return <ResetPasswordForm key={`${props.token ?? 'missing'}:${props.redirectUrl ?? ''}`} {...props} />;
}
