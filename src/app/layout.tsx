import { parseAppearanceCookie, APPEARANCE_COOKIE } from '@mairie360/lib-components/theme';
import { cookies } from 'next/headers';
import { instanceTimeZone } from '@mairie360/lib-components/shared';
import { InstanceProvider } from '@mairie360/lib-components/react';
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

// Rendu à la demande obligatoire : une page prérendue au build ne porterait pas le
// nonce CSP propre à chaque requête, et ses scripts seraient bloqués.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connexion | Mairie360",
  description: "Connexion à l’application Mairie360.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=8dd52d5111b8", sizes: "192x192", type: "image/x-icon" },
      { url: "/mairie360-favicon.png?v=8dd52d5111b8", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/mairie360-logo.png?v=8dd52d5111b8", sizes: "192x192", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const appearance = parseAppearanceCookie(cookieStore.get(APPEARANCE_COOKIE)?.value);
  const timeZone = instanceTimeZone(process.env.INSTANCE_TIMEZONE);
  return (
    <html lang="fr" data-theme={appearance?.theme ?? "system"} data-density={appearance?.density ?? "normal"}>
      <body className={`${geistSans.variable} mairie-ui antialiased`}>
        <a href="#login-content" className="app-skip-link">Aller au contenu</a>
        <main id="login-content" tabIndex={-1} className="login-page flex min-h-dvh items-center justify-center bg-[var(--mairie-background)]">
          <InstanceProvider role="Guest" timeZone={timeZone} appearance={appearance} appearanceCookieDomain={process.env.COOKIE_DOMAIN}>{children}</InstanceProvider>
        </main>
      </body>
    </html>
  );
}
