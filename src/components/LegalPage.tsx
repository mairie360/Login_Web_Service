import Link from "next/link";
import type { ReactNode } from "react";

// Frame of the legal pages (MAIR-292): a readable column, a title and a way back to the sign-in
// (the footer of the layout links to both pages).
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="m-6 w-full max-w-3xl rounded-md bg-white p-8 text-gray-800 shadow-sm">
      <p className="text-sm">
        <Link href="/" className="underline underline-offset-2">Retour à la connexion</Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
      <div className="legal-content mt-6 space-y-6 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mt-2 [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </article>
  );
}
