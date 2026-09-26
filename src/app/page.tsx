export const dynamic = 'force-dynamic';

import Login from "../components/Login";
import { resolveLoginRedirect } from "../lib/login-redirect";

type HomeProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { redirect } = await searchParams;
  const redirectUrl = resolveLoginRedirect(redirect);
  if (!redirectUrl) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F3F0] p-6">
        <section aria-labelledby="connection-unavailable" className="max-w-md rounded-md bg-white p-8 text-gray-800 shadow-sm">
          <h1 id="connection-unavailable" className="text-xl font-semibold">Connexion temporairement indisponible</h1>
          <p className="mt-4">Veuillez contacter votre administrateur pour rétablir l’accès à Mairie360.</p>
        </section>
      </main>
    );
  }
  return (
    <Login
      redirectUrl={redirectUrl}
    />
  );
}
