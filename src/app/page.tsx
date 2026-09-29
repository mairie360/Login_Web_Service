export const dynamic = 'force-dynamic';

import Login from "../components/Login";
import LoginShell from "../components/LoginShell";
import { resolveLoginRedirect } from "../lib/login-redirect";
import { loginShellHrefs } from "../lib/login-shell-hrefs";

type HomeProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { redirect } = await searchParams;
  const redirectUrl = resolveLoginRedirect(redirect);
  const hrefs = loginShellHrefs();

  if (!redirectUrl) {
    return (
      <LoginShell hrefs={hrefs}>
        <div className="flex min-h-full items-center justify-center">
          <section aria-labelledby="connection-unavailable" className="max-w-md rounded-md bg-white p-8 text-gray-800 shadow-sm">
            <h1 id="connection-unavailable" className="text-xl font-semibold">Connexion temporairement indisponible</h1>
            <p className="mt-4">Veuillez contacter votre administrateur pour rétablir l’accès à Mairie360.</p>
          </section>
        </div>
      </LoginShell>
    );
  }
  return (
    <LoginShell hrefs={hrefs}>
      <Login redirectUrl={redirectUrl} />
    </LoginShell>
  );
}
