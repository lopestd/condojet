#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-${ROOT_DIR}/config/env/.env.dsv}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo de ambiente nao encontrado: $ENV_FILE"
  exit 1
fi

echo "[1/2] Build da imagem de migracao da API"
docker build -f "$ROOT_DIR/api-python/Dockerfile.test" -t condojet-api-python-test "$ROOT_DIR/api-python" >/dev/null

echo "[2/2] Aplicando migracoes Alembic (upgrade head)"
docker run --rm \
  --network host \
  --env-file "$ENV_FILE" \
  condojet-api-python-test \
  sh -lc "cd /app && alembic upgrade head"

echo "Migracoes aplicadas com sucesso."
