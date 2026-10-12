// Versions acceptées pour le paquet de contrat @mairie360/bff-*-openapi et tag d'image GHCR correspondant.
//
// - `X.Y.Z` : release publiée par semantic-release ; l'image `ghcr.io/mairie360/bff-*` porte le même tag.
// - `0.0.0-dev.<sha40>` : paquet publié par le job Release Dev de la CICD pour chaque commit de `main`
//   du BFF ; l'image correspondante est taguée `dev-<sha7>` (MAIR-509, alignement sur `main` tant
//   qu'aucune release n'est coupée). Les pré-versions `staging` ne sont jamais épinglées.
const RELEASE_VERSION = /^\d+\.\d+\.\d+$/;
const DEV_VERSION = /^0\.0\.0-dev\.([0-9a-f]{40})$/;

export function isAcceptedContractVersion(version) {
  return typeof version === 'string' && (RELEASE_VERSION.test(version) || DEV_VERSION.test(version));
}

/** Tag de l'image `ghcr.io/mairie360/bff-*` construite à partir du même commit que le paquet `version`. */
export function imageTagForContractVersion(version) {
  const dev = DEV_VERSION.exec(version);
  if (dev) return `dev-${dev[1].slice(0, 7)}`;
  if (RELEASE_VERSION.test(version)) return version;
  throw new Error(`Version de contrat inattendue : ${version}`);
}
