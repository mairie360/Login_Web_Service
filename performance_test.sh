#!/usr/bin/env bash

COMPOSE_FILE="docker-compose-performance.yml"
SERVICE_NAME="k6-perf-test"

# The CI exports IMAGE_REF (the image published by release-dev, MAIR-317). Locally, build the
# front from the Dockerfile (NODE_AUTH_TOKEN needed) and point the stack at it.
if [ -z "${IMAGE_REF:-}" ]; then
  echo "==> [0/4] Building login-front:local from the Dockerfile..."
  docker build -t login-front:local --secret id=node_auth_token,env=NODE_AUTH_TOKEN . || exit 1
  export IMAGE_REF="login-front:local"
fi
echo "==> Front under test: $IMAGE_REF"

echo "==> [1/4] Démarrage de la stack et lancement du test k6..."
docker compose -f "$COMPOSE_FILE" up -d

echo "==> [2/4] Attente de la fin du test k6..."
docker compose -f "$COMPOSE_FILE" wait "$SERVICE_NAME"
EXIT_CODE=$?

echo "==> [3/4] Affichage des résultats (logs)..."
docker compose -f "$COMPOSE_FILE" logs "$SERVICE_NAME"

echo "==> [4/4] Nettoyage des conteneurs..."
docker compose -f "$COMPOSE_FILE" down -v

echo "----------------------------------------"
echo "Code de sortie final : $EXIT_CODE"
echo "----------------------------------------"

exit $EXIT_CODE
