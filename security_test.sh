#!/usr/bin/env bash

COMPOSE_FILE="docker-compose-security.yml"
SERVICE_NAME="security-scan"

echo "==> [1/4] Démarrage de la stack et lancement du scan ZAP..."
docker compose -f "$COMPOSE_FILE" up -d --build
UP_EXIT_CODE=$?

echo "==> [2/4] Attente de la fin du scan de sécurité..."
docker compose -f "$COMPOSE_FILE" wait "$SERVICE_NAME"
EXIT_CODE=$?
# `compose wait` answers 0 when the service never started (a dependency failed at `up`):
# the run is then a failure, not a pass without findings.
if [ "$UP_EXIT_CODE" -ne 0 ]; then
  echo "La stack n'a pas démarré (docker compose up a échoué avec le code $UP_EXIT_CODE) : les logs des services suivent."
  docker compose -f "$COMPOSE_FILE" logs --no-color | grep -vE 'Running Changeset' | tail -60
  EXIT_CODE=1
fi

echo "==> [3/4] Affichage du rapport (logs)..."
docker compose -f "$COMPOSE_FILE" logs "$SERVICE_NAME"

echo "==> [4/4] Nettoyage des conteneurs..."
docker compose -f "$COMPOSE_FILE" down -v

echo "----------------------------------------"
echo "Code de sortie final : $EXIT_CODE"
echo "----------------------------------------"

exit $EXIT_CODE
