"use client";

import { Card, Divider, Help } from "@mairie360/lib-components/primitives";
import { Logo } from "@mairie360/lib-components/shell";
import type { ReactNode } from "react";
import { useInstanceBrand } from "../../lib/instance-brand";

// Central card shared by every page of the V2 mock-up (MAIR-830), lib components only. MAIR-1102: the
// « Marque de la commune » block opens the card (lib Logo xl, Help with the commune line, lib Divider under it).
export default function RecoveryLayout({ children }: { children: ReactNode }) {
  return <div className="flex w-full max-w-lg flex-col items-center px-4 py-6">
    <Card className="flex w-full min-w-0 flex-col gap-4 p-4 [overflow-wrap:anywhere] sm:p-6">
      <div data-brand className="flex flex-col items-center gap-2 text-center">
        <Logo size="xl" alt="Logo Mairie360" />
        <Help>{useInstanceBrand()}</Help>
      </div>
      <Divider />
      {children}
    </Card>
  </div>;
}
