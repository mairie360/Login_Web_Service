#!/usr/bin/env bash
# End-to-end journeys of the front (MAIR-603): starts the isolated docker-compose-e2e.yml stack,
# runs the Playwright specs of e2e/ from the `playwright` service, keeps the report in
# e2e-report/ (HTML report, traces and videos of the failed journeys) and tears the stack down.
# TARGET_IMAGE (CI, MAIR-602): tests the published front image instead of rebuilding it here.

COMPOSE_FILE="docker-compose-e2e.yml"
SERVICE_NAME="playwright"

# A front without journeys must fail, not pass silently (MAIR-602 acceptance criteria).
if ! ls e2e/*.spec.ts >/dev/null 2>&1; then
  echo "No Playwright spec found in e2e/: the end-to-end job cannot pass without journeys."
  exit 1
fi
mkdir -p e2e-report
# The Playwright service runs as the caller, so the report stays theirs (and the CI runner's).
export E2E_UID="$(id -u)" E2E_GID="$(id -g)"

# The journeys expect a fresh seed: drop what an interrupted run may have left behind, and tear
# the stack down whatever happens next (Ctrl-C, CI cancellation, a step that fails).
docker compose -f "$COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1
TORN_DOWN=0
teardown() {
  [ "$TORN_DOWN" = 1 ] && return 0
  TORN_DOWN=1
  echo "==> [4/4] Tearing the containers down..."
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans
}
trap 'teardown; exit 130' INT TERM
trap 'teardown' EXIT

echo "==> [1/4] Starting the stack and the Playwright journeys..."
if [ -n "${TARGET_IMAGE:-}" ]; then
  echo "Image under test: $TARGET_IMAGE (no local build)."
  docker compose -f "$COMPOSE_FILE" up -d --no-build --pull missing
else
  docker compose -f "$COMPOSE_FILE" up -d --build --pull missing
fi
UP_EXIT_CODE=$?

echo "==> [2/4] Waiting for the journeys to finish..."
docker compose -f "$COMPOSE_FILE" wait "$SERVICE_NAME"
EXIT_CODE=$?
# `compose wait` answers 0 when the service never started (a dependency failed at `up`):
# the run is then a failure, not a pass.
if [ "$UP_EXIT_CODE" -ne 0 ]; then
  echo "The stack did not start (docker compose up exited with $UP_EXIT_CODE): service logs follow."
  docker compose -f "$COMPOSE_FILE" logs --no-color | grep -vE 'Running Changeset' | tail -60
  EXIT_CODE=1
fi

echo "==> [3/4] Journey results (logs)..."
docker compose -f "$COMPOSE_FILE" logs --no-color "$SERVICE_NAME"

# A teardown that fails leaves seeded volumes for the next run: the run fails too.
if ! teardown; then
  echo "Teardown failed: containers or volumes of $COMPOSE_FILE may remain."
  [ "$EXIT_CODE" -eq 0 ] && EXIT_CODE=1
fi

echo "----------------------------------------"
echo "Final exit code: $EXIT_CODE (report in e2e-report/)"
echo "----------------------------------------"

exit $EXIT_CODE
