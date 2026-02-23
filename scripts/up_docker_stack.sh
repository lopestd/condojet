#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-${ROOT_DIR}/config/env/.env.dsv}"
LEGACY_CONTAINERS=("condojet-api-python-local")

docker_cmd() {
  if sudo -n true >/dev/null 2>&1; then
    sudo docker "$@"
  else
    docker "$@"
  fi
}

cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo de ambiente nao encontrado: $ENV_FILE"
  echo "Uso: scripts/up_docker_stack.sh [caminho_env]"
  exit 1
fi

for container in "${LEGACY_CONTAINERS[@]}"; do
  if docker_cmd ps -a --format '{{.Names}}' | grep -qx "$container"; then
    echo "Removendo container legado para evitar conflito: $container"
    docker_cmd rm -f "$container" >/dev/null
  fi
done

echo "Subindo stack Docker Compose com env: $ENV_FILE"
docker_cmd compose --env-file "$ENV_FILE" up -d --build --remove-orphans

echo "Stack em execucao. Servicos:"
docker_cmd compose --env-file "$ENV_FILE" ps
