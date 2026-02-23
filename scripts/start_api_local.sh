#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR/api-python"
if [[ ! -f .venv/bin/activate ]]; then
  rm -rf .venv
  python3 -m venv .venv
fi
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt -r requirements-dev.txt

export PYTHONPATH="$ROOT_DIR/api-python"
set -a
source "$ROOT_DIR/config/env/.env.dsv"
set +a

exec uvicorn src.main:app --host 0.0.0.0 --port 8000
