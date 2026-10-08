import type { Metadata } from "next";
import LegalPage from "../../components/LegalPage";
import { orToComplete, readLegalConfig, TO_COMPLETE } from "../../lib/legal-config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Politique de confidentialité | Mairie360" };

// Privacy policy of the instance (MAIR-292). The retention periods and subprocessors come from
// LEGAL_CONFIG, which repeats the mairie's decisions (Devops/Deploiment compliance/<org>/).
export default function PrivacyPolicyPage() {
  const legal = readLegalConfig();
  return (
    <LegalPage title="Politique de confidentialité">
      <section>
        <h2>Responsable du traitement</h2>
        <p>
          {orToComplete(legal.mairie.name)}, {orToComplete(legal.mairie.address)}. Mairie 360 traite les données pour
          son compte, comme sous-traitant.
        </p>
      </section>
      <section>
        <h2>Délégué à la protection des données</h2>
        <p>{orToComplete(legal.dpo.name)}</p>
        <p>Contact : {orToComplete(legal.dpo.email)}</p>
      </section>
      <section>
        <h2>Finalités</h2>
        <p>
          Les données des agents servent à gérer leur compte et leur connexion, l’annuaire interne, la messagerie, l’agenda,
          les projets et les formations de la mairie, ainsi qu’à assurer la sécurité de la plateforme.
        </p>
      </section>
      <section>
        <h2>Durées de conservation</h2>
        {legal.retention.length > 0 ? (
          <ul>
            {legal.retention.map(({ label, period }) => (
              <li key={label}>
                {label} : {period}
              </li>
            ))}
          </ul>
        ) : (
          <p>{TO_COMPLETE}</p>
        )}
        <p>Les adresses IP des journaux de sécurité sont conservées pour la sécurité de la plateforme, sur la même durée.</p>
      </section>
      <section>
        <h2>Sous-traitants</h2>
        {legal.subprocessors.length > 0 ? (
          <ul>
            {legal.subprocessors.map(({ name, location, purpose }) => (
              <li key={name}>
                {name} ({location}) : {purpose}
              </li>
            ))}
          </ul>
        ) : (
          <p>{TO_COMPLETE}</p>
        )}
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez accéder à vos données, les faire rectifier ou effacer, et vous opposer à leur traitement ou en
          demander la limitation, en écrivant au délégué à la protection des données. Vous pouvez aussi adresser une
          réclamation à la CNIL (www.cnil.fr).
        </p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>
          Seuls des cookies de session, nécessaires à la connexion, sont déposés. Aucun cookie de mesure d’audience ni
          traceur tiers n’est utilisé.
        </p>
      </section>
    </LegalPage>
  );
}
