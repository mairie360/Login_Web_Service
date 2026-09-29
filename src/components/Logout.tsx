"use client";

import { Button } from "@mairie360/lib-components";
import { useCallback, useEffect, useRef, useState } from "react";

type LogoutProps = { navigate?: (url: string) => void };

const goToLogin = (url: string) => window.location.replace(url);

export default function Logout({ navigate = goToLogin }: LogoutProps) {
  const started = useRef(false);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState(false);

  const logout = useCallback(async () => {
    setPending(true);
    setError(false);

    try {
      const upstream = await fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!upstream.ok) throw new Error("BFF logout failed");

      const local = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!local.ok) throw new Error("Cookie expiry failed");

      navigate("/");
    } catch {
      setError(true);
      setPending(false);
    }
  }, [navigate]);

  useEffect(() => {
    // React StrictMode can replay mount effects; one handoff must make one BFF request.
    if (started.current) return;
    started.current = true;
    void logout();
  }, [logout]);

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-[#F5F3F0] p-6">
      <section aria-labelledby="logout-heading" className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 text-gray-900 shadow-lg">
        <h1 id="logout-heading" className="text-2xl font-bold">Déconnexion</h1>
        {pending ? <p role="status" className="mt-4 text-gray-600">Déconnexion en cours…</p> : null}
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
