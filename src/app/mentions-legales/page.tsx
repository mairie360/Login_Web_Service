import Link from "next/link";
import type { Metadata } from "next";
import LegalPage from "../../components/LegalPage";
import { orToComplete, readLegalConfig } from "../../lib/legal-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mentions légales | Mairie360" };

// Legal notice of the instance (MAIR-292), from LEGAL_CONFIG at request time.
export default function LegalNoticePage() {
  const legal = readLegalConfig();
  return (
    <LegalPage title="Mentions légales">
      <section>
        <h2>Éditeur du service</h2>
        <p>{orToComplete(legal.mairie.name)}</p>
        <p>{orToComplete(legal.mairie.address)}</p>
        {legal.mairie.email && <p>Contact : {legal.mairie.email}</p>}
        <p>Directeur ou directrice de la publication : {orToComplete(legal.publicationDirector)}</p>
      </section>
      <section>
        <h2>Prestataire</h2>
        <p>
          Le service est fourni par Mairie 360, sous-traitant de la mairie au sens du Règlement général sur la protection
          des données (RGPD).
        </p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>{orToComplete(legal.host.name)}</p>
        <p>{orToComplete(legal.host.address)}</p>
      </section>
      <section>
        <h2>Données personnelles</h2>
        <p>
          Le traitement de vos données est décrit dans la <Link href="/confidentialite" className="underline underline-offset-2">politique de confidentialité</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
