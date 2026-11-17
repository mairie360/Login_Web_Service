"use client";

import { Card } from "@mairie360/lib-components/primitives";
import { Logo } from "@mairie360/lib-components/shell";
import type { ReactNode } from "react";

// Logo and central card shared by every page of the V2 mock-up (MAIR-830): lib components only.
export default function RecoveryLayout({ children }: { children: ReactNode }) {
  return <div className="flex w-full max-w-lg flex-col items-center gap-6 px-4 py-6">
    <Logo size="xl" alt="Logo Mairie360" />
    <Card className="flex w-full min-w-0 flex-col gap-4 p-4 [overflow-wrap:anywhere] sm:p-6">{children}</Card>
  </div>;
}
