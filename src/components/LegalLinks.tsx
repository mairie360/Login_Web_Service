import { LEGAL_NOTICE_PATH, PRIVACY_POLICY_PATH } from "../lib/legal-config";

// Links of every page to the legal notice and the privacy policy (MAIR-292). The other fronts
// link to these pages of the login front through LOGIN_FRONT_URL.
export default function LegalLinks() {
  return (
    <footer className="w-full bg-[#F5F3F0] px-6 pb-6 text-center text-sm text-[#4c5258]">
      <nav aria-label="Informations légales" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <a href={LEGAL_NOTICE_PATH} className="underline underline-offset-2 hover:text-[#1256a6]">
          Mentions légales
        </a>
        <a href={PRIVACY_POLICY_PATH} className="underline underline-offset-2 hover:text-[#1256a6]">
          Politique de confidentialité
        </a>
      </nav>
    </footer>
  );
}
