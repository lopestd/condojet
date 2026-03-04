#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

DEFAULT_PLATFORM="linux/amd64"
PLATFORM="${DEFAULT_PLATFORM}"
ALSO_LATEST="false"

# Backward compatibility:
#   scripts/push_dockerhub_linux_images.sh <namespace> <tag> [platform]
# Preferred:
#   scripts/push_dockerhub_linux_images.sh --namespace <ns> --tag <tag> [--platform <plat>] [--also-latest]
NAMESPACE="${DOCKERHUB_NAMESPACE:-}"
TAG="${DOCKERHUB_TAG:-}"

usage() {
  cat <<'EOF'
Uso:
  scripts/push_dockerhub_linux_images.sh <dockerhub_namespace> <tag> [platform]
  scripts/push_dockerhub_linux_images.sh --namespace <dockerhub_namespace> --tag <tag> [--platform <platform>] [--also-latest]

Exemplos:
  scripts/push_dockerhub_linux_images.sh meuusuario v1.0.0
  scripts/push_dockerhub_linux_images.sh minhaorg latest linux/amd64
  scripts/push_dockerhub_linux_images.sh --namespace minhaorg --tag v1.4.0 --also-latest

Descrição:
  Faz build e push das imagens Linux do CondoJET no Docker Hub:
    - <namespace>/condojet-api-python:<tag>
    - <namespace>/condojet-backend:<tag>
    - <namespace>/condojet-frontend:<tag>

Pré-requisitos:
  1) docker login
  2) docker buildx disponível

Variáveis opcionais:
  DOCKERHUB_NAMESPACE   Namespace no Docker Hub
  DOCKERHUB_TAG         Tag principal

Defaults sem parâmetros:
  namespace = usuário autenticado no Docker (docker info)
  tag       = latest
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ge 2 && "${1:-}" != "--namespace" && "${1:-}" != "--tag" && "${1:-}" != "--platform" ]]; then
  NAMESPACE="$1"
  TAG="$2"
  if [[ $# -ge 3 ]]; then
    PLATFORM="$3"
  fi
else
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --namespace|-n)
        NAMESPACE="${2:-}"
        shift 2
        ;;
      --tag|-t)
        TAG="${2:-}"
        shift 2
        ;;
      --platform|-p)
        PLATFORM="${2:-}"
        shift 2
        ;;
      --also-latest)
        ALSO_LATEST="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "Erro: argumento inválido '$1'." >&2
        usage
        exit 1
        ;;
    esac
  done
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

DOCKER_USER="$(docker info 2>/dev/null | awk -F': ' '/Username:/ {print $2; exit}')"
if [[ -z "${DOCKER_USER}" ]]; then
  echo "Erro: não há sessão autenticada no Docker Hub. Execute 'docker login'." >&2
  exit 1
fi

if [[ -z "${NAMESPACE}" ]]; then
  NAMESPACE="${DOCKER_USER}"
fi

if [[ -z "${TAG}" ]]; then
  TAG="latest"
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
  local full_image_primary="${NAMESPACE}/${image_name}:${TAG}"
  local tag_args=("--tag" "${full_image_primary}")

  if [[ "${ALSO_LATEST}" == "true" ]]; then
    tag_args+=("--tag" "${NAMESPACE}/${image_name}:latest")
  fi

  echo "==> Build/PUSH ${full_image_primary} (${PLATFORM})"
  docker buildx build \
    --platform "${PLATFORM}" \
    --file "${dockerfile_path}" \
    "${tag_args[@]}" \
    --push \
    "${context_dir}"
}

build_and_push "condojet-api-python" "${ROOT_DIR}/api-python" "${ROOT_DIR}/api-python/Dockerfile"
build_and_push "condojet-backend" "${ROOT_DIR}/backend" "${ROOT_DIR}/backend/Dockerfile"
build_and_push "condojet-frontend" "${ROOT_DIR}/frontend" "${ROOT_DIR}/frontend/Dockerfile"

if [[ "${ALSO_LATEST}" == "true" ]]; then
  echo "Concluído. Imagens publicadas no Docker Hub para namespace '${NAMESPACE}' com tags '${TAG}' e 'latest'."
else
  echo "Concluído. Imagens publicadas no Docker Hub para namespace '${NAMESPACE}' com tag '${TAG}'."
fi
