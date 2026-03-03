#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/config/env/.env.dsv"
CONFIRM=false
SEED_ADMIN=true

usage() {
  cat <<USAGE
Uso: scripts/db_dev_reset_and_migrate.sh [--env-file CAMINHO] [--yes] [--skip-seed]

Descricao:
  Reseta completamente o schema de desenvolvimento e aplica migracoes Alembic do zero.
  Fluxo:
    1) DROP SCHEMA <DB_SCHEMA> CASCADE
    2) CREATE SCHEMA <DB_SCHEMA>
    3) alembic upgrade head (imagem de testes da API)
    4) seed de usuarios admin (opcional)

Opcoes:
  --env-file CAMINHO  Arquivo de ambiente (padrao: config/env/.env.dsv)
  --yes               Confirma operacao destrutiva sem prompt interativo
  --skip-seed         Nao executa seed de usuarios admin ao final
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --yes)
      CONFIRM=true
      shift
      ;;
    --skip-seed)
      SEED_ADMIN=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Parametro invalido: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo de ambiente nao encontrado: $ENV_FILE"
  exit 1
fi

DB_HOST=$(awk -F= '/^DB_HOST=/{print substr($0, index($0,$2)); exit}' "$ENV_FILE")
DB_PORT=$(awk -F= '/^DB_PORT=/{print substr($0, index($0,$2)); exit}' "$ENV_FILE")
DB_USER=$(awk -F= '/^DB_USER=/{print substr($0, index($0,$2)); exit}' "$ENV_FILE")
DB_PASSWORD=$(awk -F= '/^DB_PASSWORD=/{print substr($0, index($0,$2)); exit}' "$ENV_FILE")
DB_NAME=$(awk -F= '/^DB_NAME=/{print substr($0, index($0,$2)); exit}' "$ENV_FILE")
DB_SCHEMA=$(awk -F= '/^DB_SCHEMA=/{print substr($0, index($0,$2)); exit}' "$ENV_FILE")

: "${DB_HOST:?DB_HOST nao definido}"
: "${DB_PORT:?DB_PORT nao definido}"
: "${DB_USER:?DB_USER nao definido}"
: "${DB_PASSWORD:?DB_PASSWORD nao definido}"
: "${DB_NAME:?DB_NAME nao definido}"
: "${DB_SCHEMA:=admcondojet}"

if [[ "$CONFIRM" != true ]]; then
  echo "ATENCAO: Operacao destrutiva no banco de desenvolvimento."
  echo "Banco: ${DB_HOST}:${DB_PORT}/${DB_NAME} | Schema: ${DB_SCHEMA}"
  read -r -p "Digite RESETAR para confirmar: " ANSWER
  if [[ "$ANSWER" != "RESETAR" ]]; then
    echo "Operacao cancelada."
    exit 1
  fi
fi

cat > /tmp/condojet_reset_schema.sql <<SQL
DO \$\$
BEGIN
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', '${DB_SCHEMA}');
  EXECUTE format('CREATE SCHEMA %I', '${DB_SCHEMA}');
END\$\$;
SQL

echo "[1/4] Resetando schema ${DB_SCHEMA}..."
PGPASSWORD="$DB_PASSWORD" \
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f /tmp/condojet_reset_schema.sql >/dev/null

echo "[2/4] Build da imagem de migracao da API..."
docker build -f "$ROOT_DIR/api-python/Dockerfile.test" -t condojet-api-python-test "$ROOT_DIR/api-python" >/dev/null

echo "[3/4] Aplicando migracoes Alembic (upgrade head)..."
docker run --rm \
  --network host \
  --env-file "$ENV_FILE" \
  condojet-api-python-test \
  sh -lc "cd /app && alembic upgrade head" >/dev/null

if [[ "$SEED_ADMIN" == true ]]; then
  echo "[4/4] Aplicando seed de usuarios admin..."
  "$ROOT_DIR/tests_env/scripts/seed_api_admin_user.sh" >/dev/null
else
  echo "[4/4] Seed pulado (--skip-seed)."
fi

echo "Reset e migracao concluidos com sucesso."
