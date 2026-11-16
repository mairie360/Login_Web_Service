// Accepted versions for the @mairie360/bff-*-openapi contract package.
//
// - `X.Y.Z`: release published by semantic-release.
// - `0.0.0-dev.<sha40>`: package published by the CICD Release Dev job for each commit of the BFF's
//   `main` (MAIR-509).
// - `0.0.0-staging.<sha40>`: the same commit once released on staging (MAIR-600).
// The stacks do not run the image built from that commit: they run the BFF image of the stage under
// test, `${UPSTREAM_TAG:-dev}` (MAIR-998), so the package is only bumped when the code needs it.
const RELEASE_VERSION = /^\d+\.\d+\.\d+$/;
const PRERELEASE_VERSION = /^0\.0\.0-(dev|staging)\.([0-9a-f]{40})$/;

export function isAcceptedContractVersion(version) {
  return typeof version === 'string' && (RELEASE_VERSION.test(version) || PRERELEASE_VERSION.test(version));
}

