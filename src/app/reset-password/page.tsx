import type { Metadata } from "next";
import ResetPassword from '../../components/ResetPassword';
import { resolveLoginRedirect } from "../../lib/login-redirect";

export const metadata: Metadata = { title: "Réinitialiser le mot de passe | Mairie360", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[]; redirect?: string | string[] }> }) {
  const { token, redirect } = await searchParams;
  return <ResetPassword token={typeof token === "string" ? token : undefined} redirectUrl={resolveLoginRedirect(redirect)} />;
}
