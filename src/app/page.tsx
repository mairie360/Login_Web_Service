export const dynamic = 'force-dynamic';

import Login from "../components/Login";
import { resolveLoginRedirect } from "../lib/login-redirect";
import { parseFrontUrl } from "../lib/front-url";

type HomeProps = {
  searchParams: Promise<{ redirect?: string | string[]; resumeSession?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { redirect, resumeSession } = await searchParams;
  const redirectUrl = resolveLoginRedirect(redirect);
  const requested = typeof redirect === "string" ? parseFrontUrl(redirect) : undefined;
  const login = parseFrontUrl(process.env.LOGIN_FRONT_URL);
  const canResume = Boolean(login && requested && resumeSession === "1" &&
    requested.href === redirectUrl && requested.origin !== login.origin);

  if (!redirectUrl) {
    return (
      <div className="flex w-full items-center justify-center p-6">
        <section aria-labelledby="connection-unavailable" className="max-w-md rounded-md bg-white p-8 text-gray-800 shadow-sm">
          <h1 id="connection-unavailable" className="text-xl font-semibold">Connexion temporairement indisponible</h1>
          <p className="mt-4">Veuillez contacter votre administrateur pour rétablir l’accès à Mairie360.</p>
        </section>
      </div>
    );
  }
  return <Login key={`${canResume ? "resume" : "signin"}:${redirectUrl}`} redirectUrl={redirectUrl} resumeSession={canResume} />;
}
