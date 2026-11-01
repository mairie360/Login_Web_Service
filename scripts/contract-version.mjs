// Accepted versions for the @mairie360/bff-*-openapi contract package, and the matching GHCR image tag.
//
// - `X.Y.Z`: release published by semantic-release; the `ghcr.io/mairie360/bff-*` image has the same tag.
// - `0.0.0-dev.<sha40>`: package published by the CICD Release Dev job for each commit of the BFF's
//   `main`; the matching image is tagged `dev-<sha7>` (MAIR-509).
// - `0.0.0-staging.<sha40>`: the same commit once released on staging; the matching image is tagged
//   `staging-<sha7>` (same digest as `dev-<sha7>`). Preferred on a staging release for readability (MAIR-600).
const RELEASE_VERSION = /^\d+\.\d+\.\d+$/;
const PRERELEASE_VERSION = /^0\.0\.0-(dev|staging)\.([0-9a-f]{40})$/;

export function isAcceptedContractVersion(version) {
  return typeof version === 'string' && (RELEASE_VERSION.test(version) || PRERELEASE_VERSION.test(version));
}

/** Tag of the `ghcr.io/mairie360/bff-*` image built from the same commit as the package `version`. */
export function imageTagForContractVersion(version) {
  const prerelease = PRERELEASE_VERSION.exec(version);
  if (prerelease) return `${prerelease[1]}-${prerelease[2].slice(0, 7)}`;
  if (RELEASE_VERSION.test(version)) return version;
  throw new Error(`Unexpected contract version: ${version}`);
}
