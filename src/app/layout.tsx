import { parseAppearanceCookie, APPEARANCE_COOKIE } from '@mairie360/lib-components/theme';
import { cookies } from 'next/headers';
import { instanceTimeZone } from '@mairie360/lib-components/shared';
import { InstanceProvider } from '@mairie360/lib-components/react';
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Footer, PublicBackdrop } from "@mairie360/lib-components/shell";
import { LEGAL_NOTICE_PATH, PRIVACY_POLICY_PATH, readLegalConfig } from "../lib/legal-config";
import { brandLine } from "../lib/brand-line";
import { InstanceBrandProvider } from "../lib/instance-brand";

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
  // MAIR-1102: the commune named in the card comes from the instance configuration (LEGAL_CONFIG), never the code.
  const brand = brandLine(readLegalConfig().mairie.name);
  return (
    <html lang="fr" data-theme="light" data-density={appearance?.density ?? "normal"}>
      {/* MAIR-1261 (artifact): the page is a full-height column, so the footer stays visible at the bottom of the screen. */}
      <body className={`${geistSans.variable} mairie-ui antialiased flex min-h-dvh flex-col bg-[var(--mairie-background)]`}>
        {/* MAIR-1102: the ribbons of the public pages, fixed behind the card (PublicBackdrop of lib-components 2.3, MAIR-1103). */}
        <PublicBackdrop />
        <a href="#login-content" className="app-skip-link">Aller au contenu</a>
        <main id="login-content" tabIndex={-1} className="login-page relative z-[1] flex flex-1 items-center justify-center">
          <InstanceProvider role="Guest" timeZone={timeZone} appearance={appearance} appearanceCookieDomain={process.env.COOKIE_DOMAIN}>
            <InstanceBrandProvider line={brand}>{children}</InstanceBrandProvider>
          </InstanceProvider>
        </main>
        {/* Every page links to the legal notice and the privacy policy (MAIR-292). */}
        <Footer variant="horizontal" version={process.env.APP_VERSION?.trim() || undefined}
          legalLinks={{ legalNotice: LEGAL_NOTICE_PATH, privacyPolicy: PRIVACY_POLICY_PATH }} className="relative z-[1]" />
      </body>
    </html>
  );
}
