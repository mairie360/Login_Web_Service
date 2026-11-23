import type { Metadata } from "next";
import ForgotPassword from '../../components/ForgotPassword';
import { resolveLoginRedirect } from "../../lib/login-redirect";

export const metadata: Metadata = { title: "Mot de passe oublié | Mairie360", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ redirect?: string | string[]; email?: string | string[] }> }) {
  const { redirect, email } = await searchParams;
  // Only a plausible address is prefilled (MAIR-773, « Ce n’était pas moi »).
  const initialEmail = typeof email === "string" && email.length <= 320 && /^[^\s@]+@[^\s@]+$/.test(email) ? email : "";
  return <ForgotPassword redirectUrl={resolveLoginRedirect(redirect)} initialEmail={initialEmail} />;
}
