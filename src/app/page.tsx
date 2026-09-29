export const dynamic = 'force-dynamic';

import Login from "../components/Login";
import LoginShell from "../components/LoginShell";
import { parseFrontUrl } from "../lib/front-url";
import { resolveLoginRedirect } from "../lib/login-redirect";

type HomeProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { redirect } = await searchParams;
  const redirectUrl = resolveLoginRedirect(redirect);
  const configuredFront = (key: string) => parseFrontUrl(process.env[key])?.href;
  const settingsUrl = configuredFront("SETTINGS_FRONT_URL");
  const hrefs = {
    dashboard: configuredFront("DASHBOARD_FRONT_URL"),
    projects: configuredFront("PROJECT_FRONT_URL"),
    messages: configuredFront("MESSAGE_FRONT_URL"),
    training: configuredFront("ELEARNING_FRONT_URL"),
    calendar: configuredFront("CALENDAR_FRONT_URL"),
    settings: settingsUrl,
    profile: settingsUrl,
    admin: configuredFront("ADMINISTRATION_FRONT_URL"),
  };

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
