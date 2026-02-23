#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000/api/v1}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-40}"

start_ts=$(date +%s)
while true; do
  if curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
    echo "API pronta em ${BASE_URL}/health"
    exit 0
  fi

  now_ts=$(date +%s)
  elapsed=$((now_ts - start_ts))
  if [[ "$elapsed" -ge "$TIMEOUT_SECONDS" ]]; then
    echo "Timeout aguardando API (${TIMEOUT_SECONDS}s)"
    exit 1
  fi
  sleep 1
done
