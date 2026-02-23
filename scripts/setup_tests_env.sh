#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR/tests_env"

python3 -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate

python -m pip install --upgrade pip
python -m pip install -r "$ROOT_DIR/api-python/requirements.txt" -r "$ROOT_DIR/api-python/requirements-dev.txt"

if [[ ! -f .env.test && -f .env.test.example ]]; then
  cp .env.test.example .env.test
fi

echo "tests_env local pronto em tests_env/.venv"
