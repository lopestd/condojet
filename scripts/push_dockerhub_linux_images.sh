#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

DEFAULT_PLATFORM="linux/amd64"
PLATFORM="${DEFAULT_PLATFORM}"

usage() {
  cat <<'EOF'
Uso:
  scripts/push_dockerhub_linux_images.sh <dockerhub_namespace> <tag> [platform]

Exemplos:
  scripts/push_dockerhub_linux_images.sh meuusuario v1.0.0
  scripts/push_dockerhub_linux_images.sh minhaorg latest linux/amd64

Descrição:
  Faz build e push das imagens Linux do CondoJET no Docker Hub:
    - <namespace>/condojet-api-python:<tag>
    - <namespace>/condojet-backend:<tag>
    - <namespace>/condojet-frontend:<tag>

Pré-requisitos:
  1) docker login
  2) docker buildx disponível
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage
  exit 1
fi

NAMESPACE="$1"
TAG="$2"
if [[ $# -eq 3 ]]; then
  PLATFORM="$3"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Erro: docker não encontrado no PATH." >&2
  exit 1
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "Erro: docker buildx não está disponível." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Erro: daemon Docker indisponível. Verifique se o Docker está em execução." >&2
  exit 1
fi

if ! docker buildx inspect condojet-builder >/dev/null 2>&1; then
  docker buildx create --name condojet-builder --use >/dev/null
else
  docker buildx use condojet-builder >/dev/null
fi

docker buildx inspect --bootstrap >/dev/null

build_and_push() {
  local image_name="$1"
  local context_dir="$2"
  local dockerfile_path="$3"
  local full_image="${NAMESPACE}/${image_name}:${TAG}"

  echo "==> Build/PUSH ${full_image} (${PLATFORM})"
  docker buildx build \
    --platform "${PLATFORM}" \
    --file "${dockerfile_path}" \
    --tag "${full_image}" \
    --push \
    "${context_dir}"
}

build_and_push "condojet-api-python" "${ROOT_DIR}/api-python" "${ROOT_DIR}/api-python/Dockerfile"
build_and_push "condojet-backend" "${ROOT_DIR}/backend" "${ROOT_DIR}/backend/Dockerfile"
build_and_push "condojet-frontend" "${ROOT_DIR}/frontend" "${ROOT_DIR}/frontend/Dockerfile"

echo "Concluído. Imagens publicadas no Docker Hub para namespace '${NAMESPACE}' com tag '${TAG}'."
