import type { NextConfig } from "next";

// En-têtes posés sur toutes les réponses (pages, assets, routes relayées).
// La Content-Security-Policy dépend d'un nonce par requête : elle est posée par src/middleware.ts.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Toutes les ressources de la page sont servies par cette origine.
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Let Next optimize the published UI barrel; subpath adoption follows its release.
  experimental: { optimizePackageImports: ['@mairie360/lib-components'] },
  output: 'standalone',
  poweredByHeader: false,
  // The published OpenAPI package ships TypeScript sources: Next must compile them.
  transpilePackages: ['@mairie360/bff-user-openapi'],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
