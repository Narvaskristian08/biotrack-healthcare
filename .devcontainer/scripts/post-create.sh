#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.devcontainer/.runtime"
LOG_DIR="${RUNTIME_DIR}/logs"
PID_DIR="${RUNTIME_DIR}/pids"

mkdir -p "${LOG_DIR}" "${PID_DIR}"

copy_if_missing() {
  local source_file="$1"
  local target_file="$2"

  if [[ ! -f "${target_file}" ]]; then
    cp "${source_file}" "${target_file}"
  fi
}

find_flutter_bin() {
  if command -v flutter >/dev/null 2>&1; then
    command -v flutter
    return 0
  fi

  if [[ -x "/usr/local/flutter/bin/flutter" ]]; then
    echo "/usr/local/flutter/bin/flutter"
    return 0
  fi

  return 1
}

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  local escaped
  escaped="$(escape_sed_replacement "${value}")"

  if grep -q "^${key}=" "${file}"; then
    sed -i "s/^${key}=.*/${key}=${escaped}/" "${file}"
  else
    printf '\n%s=%s\n' "${key}" "${value}" >> "${file}"
  fi
}

cd "${ROOT_DIR}"

copy_if_missing "backend/env.example" "backend/.env"
copy_if_missing "web/.env.example" "web/.env.local"

upsert_env "backend/.env" "MONGODB_URI" "mongodb://mongo:27017/biotrack"
upsert_env "backend/.env" "MONGODB_REQUIRE_TLS" "false"
upsert_env "backend/.env" "MONGODB_TLS_ENABLED" "false"
upsert_env "backend/.env" "OPENROUTER_API_KEY" "dev-placeholder"

if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
  WEB_ORIGIN="https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  API_ORIGIN="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  upsert_env "backend/.env" "CORS_ORIGIN" "${WEB_ORIGIN},http://127.0.0.1:3001,http://localhost:3001"
  upsert_env "web/.env.local" "NEXT_PUBLIC_API_URL" "${API_ORIGIN}/api"
else
  upsert_env "web/.env.local" "NEXT_PUBLIC_API_URL" "http://127.0.0.1:3000/api"
fi

npm ci

FLUTTER_BIN=""
if FLUTTER_BIN="$(find_flutter_bin)"; then
  "${FLUTTER_BIN}" pub get
fi

echo "post-create complete: dependencies installed and env files prepared."
