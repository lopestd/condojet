#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Script legado: redirecionando para stack unica Docker Compose."
echo "Novo padrao: scripts/up_docker_stack.sh"
exec "${ROOT_DIR}/scripts/up_docker_stack.sh" "${1:-${ROOT_DIR}/config/env/.env.dsv}"
