export const dynamic = 'force-dynamic';

import { PageTitle, WarningAlert } from '@mairie360/lib-components/primitives';
import Login from '../components/Login';
import RecoveryLayout from '../components/RecoveryLayout';
import { resolveLoginRedirect } from "../lib/login-redirect";

type HomeProps = {
  searchParams: Promise<{ redirect?: string | string[]; returnUrl?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { redirect, returnUrl } = await searchParams;
  const returnDestination = redirect ?? returnUrl;
  const redirectUrl = resolveLoginRedirect(returnDestination);

  if (!redirectUrl) {
    return (
      <RecoveryLayout>
        <PageTitle>Connexion indisponible</PageTitle>
        <WarningAlert title="Connexion temporairement indisponible." description="Veuillez contacter votre administrateur pour rétablir l’accès à Mairie360." />
      </RecoveryLayout>
    );
  }
  return <Login key={redirectUrl} redirectUrl={redirectUrl} />;
}
