#!/usr/bin/env bash
# RGAA accessibility test of the login front (MAIR-316 / MAIR-317), same shape as security_test.sh.
# The CI (frontend-cicd.yml, release-prod) exports IMAGE_REF=<image>:staging-<sha>; locally the
# front is built from the Dockerfile (NODE_AUTH_TOKEN needed for the @mairie360 packages), or point
# IMAGE_REF at a published image, e.g. IMAGE_REF=ghcr.io/mairie360/login-front:staging.

COMPOSE_FILE="docker-compose-accessibility.yml"
SERVICE_NAME="a11y"

if [ -z "${IMAGE_REF:-}" ]; then
  echo "==> [0/4] Building login-front:local from the Dockerfile..."
  docker build -t login-front:local --secret id=node_auth_token,env=NODE_AUTH_TOKEN . || exit 1
  export IMAGE_REF="login-front:local"
fi
echo "==> Front under test: $IMAGE_REF"

# RGAA engine at the cicd_version pinned in .github/workflows/cicd.yml (the CI checks it out
# itself; override with CICD_VERSION, e.g. a branch not released yet).
CICD_DIR="cicd-repo"
if [ ! -f "$CICD_DIR/tests/a11y/run.sh" ]; then
  CICD_VERSION="${CICD_VERSION:-$(sed -n 's/^[[:space:]]*cicd_version:[[:space:]]*"\{0,1\}\([^"[:space:]#]*\).*/\1/p' .github/workflows/cicd.yml | head -n 1)}"
  echo "==> Fetching mairie360/CICD $CICD_VERSION into $CICD_DIR/..."
  rm -rf "$CICD_DIR"
  git clone --quiet --depth 1 --branch "$CICD_VERSION" https://github.com/mairie360/CICD "$CICD_DIR" || exit 1
fi
A11Y_RUNNER_IMAGE="$(cat "$CICD_DIR/tests/a11y/runner-image")"
export A11Y_RUNNER_IMAGE
RGAA_UID="$(id -u)"
RGAA_GID="$(id -g)"
export RGAA_UID RGAA_GID

mkdir -p rgaa-report .rgaa-ai-cache

echo "==> [1/4] Starting the stack and the RGAA run..."
docker compose -f "$COMPOSE_FILE" up -d

echo "==> [2/4] Waiting for the end of the RGAA run..."
docker compose -f "$COMPOSE_FILE" wait "$SERVICE_NAME"
EXIT_CODE=$?

echo "==> [3/4] Printing the run (logs; report in rgaa-report/)..."
docker compose -f "$COMPOSE_FILE" logs "$SERVICE_NAME"

echo "==> [4/4] Removing the containers..."
docker compose -f "$COMPOSE_FILE" down -v

echo "----------------------------------------"
echo "Final exit code: $EXIT_CODE"
echo "----------------------------------------"

exit $EXIT_CODE
