"use client";

import { Card } from "@mairie360/lib-components/primitives";
import { Logo } from "@mairie360/lib-components/shell";
import type { ReactNode } from "react";

// Control classes still used by the recovery pages until MAIR-881 / MAIR-888 move them to the lib.
export const recoveryInputClass = "block w-full rounded-md border border-[var(--mairie-control-border)] bg-[var(--mairie-surface)] p-2 text-sm text-[var(--mairie-text)] shadow-sm focus:border-[var(--mairie-accent)] focus:outline-2 focus:outline-[var(--mairie-accent)]";
export const recoveryButtonClass = "w-full rounded-md bg-[var(--mairie-action-background)] px-4 py-3 text-[var(--mairie-on-action)] hover:bg-[var(--mairie-action-hover-background)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-accent)] disabled:opacity-60";
export const recoveryLinkClass = "text-sm text-[var(--mairie-accent)] underline focus-visible:outline-2 focus-visible:outline-offset-2";

// Logo and central card shared by every page of the V2 mock-up (MAIR-830): lib components only.
export default function RecoveryLayout({ children }: { children: ReactNode }) {
  return <div className="flex w-full max-w-lg flex-col items-center gap-6 px-4 py-6">
    <Logo size="xl" alt="Logo Mairie360" />
    <Card className="flex w-full min-w-0 flex-col gap-4 p-4 [overflow-wrap:anywhere] sm:p-6">{children}</Card>
  </div>;
}
