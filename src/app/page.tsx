export const dynamic = 'force-dynamic';

import Login from "../components/Login";
import { resolveLoginRedirect } from "../lib/login-redirect";

type HomeProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { redirect } = await searchParams;
  return (
    <Login
      redirectUrl={resolveLoginRedirect(redirect)}
    />
  );
}
