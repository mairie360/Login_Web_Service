"use client";

import { Button } from "@mairie360/lib-components";
import { useCallback, useRef, useState } from "react";

type LogoutProps = { navigate?: (url: string) => void };

const goToLogin = (url: string) => window.location.replace(url);

export default function Logout({ navigate = goToLogin }: LogoutProps) {
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [unconfirmedDestination, setUnconfirmedDestination] = useState<string>();

  const logout = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(false);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Logout failed");
      const receipt: unknown = await response.json();
      if (typeof receipt !== "object" || receipt === null || !("session_revoked" in receipt) || typeof receipt.session_revoked !== "boolean") {
        throw new Error("Invalid logout receipt");
      }
      let destination = "/";
      if ("logout_url" in receipt) {
        if (typeof receipt.logout_url !== "string") throw new Error("Invalid logout destination");
        const url = new URL(receipt.logout_url);
        if (url.protocol !== "https:" || url.username || url.password || url.hash || !/^\/realms\/[^/]+\/protocol\/openid-connect\/logout$/.test(url.pathname)) {
          throw new Error("Invalid logout destination");
        }
        destination = url.href;
      }
      if (receipt.session_revoked) navigate(destination);
      else {
        setUnconfirmedDestination(destination);
        setPending(false);
      }
    } catch {
      inFlight.current = false;
      setError(true);
      setPending(false);
    }
  }, [navigate]);

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-[#F5F3F0] p-6">
      <section aria-labelledby="logout-heading" className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 text-gray-900 shadow-lg">
        <h1 id="logout-heading" className="text-2xl font-bold">Déconnexion</h1>
        {!pending && !error && !unconfirmedDestination ? (
          <>
            <p className="mt-4 text-gray-600">Choisissez « Se déconnecter » pour fermer votre session.</p>
            <Button type="button" label="Se déconnecter" onClick={() => void logout()} className="mt-5" />
          </>
        ) : null}
        {pending ? <p role="status" className="mt-4 text-gray-600">Déconnexion en cours…</p> : null}
        {unconfirmedDestination ? (
          <>
            <p role="alert" className="mt-4 text-gray-700">La session locale est fermée. La fermeture de la session serveur n’a pas pu être confirmée.</p>
            <Button type="button" label="Retour à la connexion" onClick={() => navigate(unconfirmedDestination)} className="mt-5" />
          </>
        ) : null}
        {error ? (
          <>
            <p role="alert" className="mt-4 text-red-700">La déconnexion n’a pas abouti. Veuillez réessayer.</p>
            <Button type="button" label="Réessayer" onClick={() => void logout()} className="mt-5" />
          </>
        ) : null}
      </section>
    </div>
  );
}
