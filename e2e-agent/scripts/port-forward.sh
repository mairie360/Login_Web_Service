#!/usr/bin/env bash
# Ouvre les accès locaux à la base et à Redis de staging (ils ne sont pas exposés: NetworkPolicy).
#
#   ./scripts/port-forward.sh            Postgres  -> 127.0.0.1:55432, Redis -> 127.0.0.1:55379
#   ./scripts/port-forward.sh --keycloak ajoute la console admin Keycloak -> http://127.0.0.1:58080
#
# Variables (voir .env.example): E2E_KUBE_CONTEXT, E2E_NAMESPACE, E2E_RELEASE.
# Ctrl-C arrête tous les tunnels.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a

CTX="${E2E_KUBE_CONTEXT:?E2E_KUBE_CONTEXT manquant}"
NS="${E2E_NAMESPACE:-mairie360-staging}"
REL="${E2E_RELEASE:-staging}"
K="kubectl --context ${CTX} -n ${NS}"

pids=()
trap 'kill "${pids[@]}" 2>/dev/null || true' EXIT INT TERM

$K port-forward "svc/${REL}-database" 55432:5432 & pids+=($!)
$K port-forward "svc/${REL}-redis" 55379:6379 & pids+=($!)
if [ "${1:-}" = "--keycloak" ]; then
  $K port-forward "svc/${REL}-keycloak" 58080:8080 & pids+=($!)
fi

echo "Tunnels ouverts (Ctrl-C pour fermer). Postgres :55432, Redis :55379"
wait
