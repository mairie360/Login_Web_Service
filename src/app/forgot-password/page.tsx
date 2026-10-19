import type { Metadata } from "next";
import ForgotPassword from "../../components/ForgotPassword";
import { resolveLoginRedirect } from "../../lib/login-redirect";

export const metadata: Metadata = { title: "Mot de passe oublié | Mairie360", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ redirect?: string | string[] }> }) {
  const { redirect } = await searchParams;
  return <ForgotPassword redirectUrl={resolveLoginRedirect(redirect)} />;
}
