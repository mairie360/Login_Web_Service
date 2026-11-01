#!/usr/bin/env bash
# RGAA accessibility test of the login front (MAIR-316 / MAIR-317), same shape as security_test.sh.
# The rgaa job of mairie360/CICD promote-prod.yml exports IMAGE_REF=<image>@<staging digest>; locally
# the front is built from the Dockerfile (NODE_AUTH_TOKEN needed for the @mairie360 packages), or
# point IMAGE_REF at a published image, e.g. IMAGE_REF=ghcr.io/mairie360/login-front:dev.

COMPOSE_FILE="docker-compose-accessibility.yml"
SERVICE_NAME="a11y"

if [ -z "${IMAGE_REF:-}" ]; then
  echo "==> [0/4] Building login-front:local from the Dockerfile..."
  docker build -t login-front:local --secret id=node_auth_token,env=NODE_AUTH_TOKEN . || exit 1
  export IMAGE_REF="login-front:local"
fi
echo "==> Front under test: $IMAGE_REF"

# RGAA engine at the cicd_version pinned in .github/workflows/cicd.yml (override with CICD_VERSION).
# The pin is a commit SHA (a clone by branch name cannot take one), a tag or a branch: fetch that
# one ref, shallow. A copy fetched here records its ref in .rgaa-ref and is fetched again when the
# pin changes; a cicd-repo/ without that file is the CI's own checkout and is used as is.
CICD_DIR="cicd-repo"
CICD_VERSION="${CICD_VERSION:-$(sed -n 's/^[[:space:]]*cicd_version:[[:space:]]*"\{0,1\}\([^"[:space:]#]*\).*/\1/p' .github/workflows/cicd.yml | head -n 1)}"
if [ ! -f "$CICD_DIR/tests/a11y/run.sh" ] ||
  { [ -f "$CICD_DIR/.rgaa-ref" ] && [ "$(cat "$CICD_DIR/.rgaa-ref")" != "$CICD_VERSION" ]; }; then
  if [ -z "$CICD_VERSION" ]; then
    echo "No cicd_version found in .github/workflows/cicd.yml (set CICD_VERSION)." >&2
    exit 1
  fi
  echo "==> Fetching mairie360/CICD $CICD_VERSION into $CICD_DIR/..."
  rm -rf "$CICD_DIR"
  git init --quiet "$CICD_DIR" &&
    git -C "$CICD_DIR" fetch --quiet --depth 1 https://github.com/mairie360/CICD "$CICD_VERSION" &&
    git -C "$CICD_DIR" -c advice.detachedHead=false checkout --quiet FETCH_HEAD || exit 1
  printf '%s\n' "$CICD_VERSION" > "$CICD_DIR/.rgaa-ref"
fi
A11Y_RUNNER_IMAGE="$(cat "$CICD_DIR/tests/a11y/runner-image")"
export A11Y_RUNNER_IMAGE
RGAA_UID="$(id -u)"
RGAA_GID="$(id -g)"
export RGAA_UID RGAA_GID

mkdir -p rgaa-report .rgaa-ai-cache

echo "==> [1/4] Starting the stack and the RGAA run..."
docker compose -f "$COMPOSE_FILE" up -d --pull missing
UP_EXIT_CODE=$?

echo "==> [2/4] Waiting for the end of the RGAA run..."
docker compose -f "$COMPOSE_FILE" wait "$SERVICE_NAME"
EXIT_CODE=$?
# `compose wait` answers 0 when the runner never started (a seeder or an API failed at `up`).
[ "$UP_EXIT_CODE" -eq 0 ] || EXIT_CODE=1

echo "==> [3/4] Printing the run (logs; report in rgaa-report/)..."
docker compose -f "$COMPOSE_FILE" logs "$SERVICE_NAME"
# The stack is removed below: print it now when something failed, the CI job cannot dump the
# containers afterwards.
[ "$EXIT_CODE" -eq 0 ] || docker compose -f "$COMPOSE_FILE" logs --no-color --tail 100 | grep -v 'Running Changeset'

echo "==> [4/4] Removing the containers..."
docker compose -f "$COMPOSE_FILE" down -v

echo "----------------------------------------"
echo "Final exit code: $EXIT_CODE"
echo "----------------------------------------"

exit $EXIT_CODE
