import Image from "next/image";
import type { ReactNode } from "react";

export const recoveryInputClass = "block w-full rounded-md border border-gray-300 bg-white p-2 text-sm !text-gray-700 shadow-sm focus:border-[#1256A6] focus:outline-2 focus:outline-[#1256A6]";
export const recoveryButtonClass = "w-full rounded-md bg-[#1256A6] px-4 py-3 text-white hover:bg-[#0e4785] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1256A6] disabled:opacity-60";
export const recoveryLinkClass = "text-sm text-[#1256A6] underline focus-visible:outline-2 focus-visible:outline-offset-2";

export default function RecoveryLayout({ children }: { children: ReactNode }) {
  return <div className="flex w-full max-w-lg flex-col items-center gap-4 p-6">
    <Image src="/logo.png" alt="Logo Mairie360" width={400} height={104} className="max-w-full" priority />
    <section className="w-full rounded-2xl border border-[#E5E7EB] bg-white p-6 text-gray-800 shadow-lg">{children}</section>
  </div>;
}
