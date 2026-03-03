#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/config/env/.env.dsv"
LEGACY_CONTAINERS=("condojet-api-python-local")
RESET_DB=false

usage() {
  cat <<USAGE
Uso: scripts/up_docker_stack.sh [--env-file CAMINHO] [--reset-db]

Opcoes:
  --env-file CAMINHO  Arquivo de ambiente (padrao: config/env/.env.dsv)
  --reset-db          Reseta schema de desenvolvimento e reaplica migracoes antes de subir a stack
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --reset-db)
      RESET_DB=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "${ENV_FILE_CUSTOM_SET:-}" ]]; then
        ENV_FILE="$1"
        ENV_FILE_CUSTOM_SET=1
        shift
      else
        echo "Parametro invalido: $1"
        usage
        exit 1
      fi
      ;;
  esac
done

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

if [[ "$RESET_DB" == true ]]; then
  echo "Reset de banco solicitado: executando scripts/db_dev_reset_and_migrate.sh"
  "$ROOT_DIR/scripts/db_dev_reset_and_migrate.sh" --env-file "$ENV_FILE" --yes
fi

echo "Subindo stack Docker Compose com env: $ENV_FILE"
docker_cmd compose --env-file "$ENV_FILE" up -d --build --remove-orphans

echo "Stack em execucao. Servicos:"
docker_cmd compose --env-file "$ENV_FILE" ps
