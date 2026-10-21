export const dynamic = 'force-dynamic';

import Login from '../components/Login';
import { resolveLoginRedirect } from "../lib/login-redirect";
import { parseFrontUrl } from "../lib/front-url";
import { isKeycloakLoginError, KEYCLOAK_ERRORS, keycloakSettings } from "../lib/keycloak-login";

type HomeProps = {
  searchParams: Promise<{ redirect?: string | string[]; returnUrl?: string | string[]; resumeSession?: string | string[]; keycloakError?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { redirect, returnUrl, resumeSession, keycloakError } = await searchParams;
  const returnDestination = redirect ?? returnUrl;
  const redirectUrl = resolveLoginRedirect(returnDestination);
  const requested = typeof returnDestination === "string" ? parseFrontUrl(returnDestination) : undefined;
  const login = parseFrontUrl(process.env.LOGIN_FRONT_URL);
  const canResume = Boolean(login && requested && resumeSession === "1" &&
    requested.href === redirectUrl && requested.origin !== login.origin);

  if (!redirectUrl) {
    return (
      <div className="flex w-full items-center justify-center p-6">
        <section aria-labelledby="connection-unavailable" className="max-w-md rounded-md bg-[var(--mairie-surface)] p-8 text-[var(--mairie-text)] shadow-sm">
          <h1 id="connection-unavailable" className="text-xl font-semibold">Connexion temporairement indisponible</h1>
          <p className="mt-4">Veuillez contacter votre administrateur pour rétablir l’accès à Mairie360.</p>
        </section>
      </div>
    );
  }
  // MAIR-153: Keycloak sign-in is offered only once the instance configures it; the password sign-in stays.
  const keycloakLoginUrl = keycloakSettings() ? `/api/auth/keycloak?redirect=${encodeURIComponent(redirectUrl)}` : undefined;
  const keycloakMessage = isKeycloakLoginError(keycloakError) ? KEYCLOAK_ERRORS[keycloakError] : undefined;
  return <Login key={`${canResume ? "resume" : "signin"}:${redirectUrl}`} redirectUrl={redirectUrl} resumeSession={canResume && !keycloakMessage}
    keycloakLoginUrl={keycloakLoginUrl} initialError={keycloakMessage} />;
}
