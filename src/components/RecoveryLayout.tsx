import Image from "next/image";
import type { ReactNode } from "react";

export const recoveryInputClass = "block w-full rounded-md border border-[var(--mairie-control-border)] bg-[var(--mairie-surface)] p-2 text-sm text-[var(--mairie-text)] shadow-sm focus:border-[var(--mairie-accent)] focus:outline-2 focus:outline-[var(--mairie-accent)]";
export const recoveryButtonClass = "w-full rounded-md bg-[var(--mairie-action-background)] px-4 py-3 text-white hover:bg-[var(--mairie-action-hover-background)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mairie-accent)] disabled:opacity-60";
export const recoveryLinkClass = "text-sm text-[var(--mairie-accent)] underline focus-visible:outline-2 focus-visible:outline-offset-2";

export default function RecoveryLayout({ children }: { children: ReactNode }) {
  return <div className="flex w-full max-w-lg flex-col items-center gap-4 p-6">
    <Image src="/logo.png" alt="Logo Mairie360" width={400} height={104} className="max-w-full" priority />
    <section className="w-full rounded-2xl border border-[var(--mairie-border)] bg-[var(--mairie-surface)] p-6 text-[var(--mairie-text)] shadow-lg">{children}</section>
  </div>;
}
