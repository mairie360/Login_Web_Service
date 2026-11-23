"use client";

import { Card, Help } from "@mairie360/lib-components/primitives";
import { Logo } from "@mairie360/lib-components/shell";
import type { ReactNode } from "react";
import { useInstanceBrand } from "../../lib/instance-brand";

// Central card shared by every page of the V2 mock-up (MAIR-830), lib components only. MAIR-1102: the
// « Marque de la commune » block opens the card (Logo xl, the commune line, a border under it); no logo above it.
export default function RecoveryLayout({ children }: { children: ReactNode }) {
  const [mairie, audience] = useInstanceBrand().split(" · ");
  return <div className="flex w-full max-w-lg flex-col items-center px-4 py-6">
    <Card className="flex w-full min-w-0 flex-col gap-4 p-4 [overflow-wrap:anywhere] sm:p-6">
      <div data-brand className="flex flex-col items-center gap-2 border-b border-[var(--mairie-border)] pb-5 text-center">
        <Logo size="xl" alt="Logo Mairie360" />
        {/* The separator is drawn, not read: « Mairie de Saint-André, espace agents et élus » for a screen reader. */}
        <Help className="m-0">{audience ? <>{mairie}<span className="sr-only">, </span><span aria-hidden="true"> · </span>{audience}</> : mairie}</Help>
      </div>
      {children}
    </Card>
  </div>;
}
