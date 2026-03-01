#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.devcontainer/.runtime"
LOG_DIR="${RUNTIME_DIR}/logs"
PID_DIR="${RUNTIME_DIR}/pids"
PID_FILE="${PID_DIR}/mobile.pid"
LOG_FILE="${LOG_DIR}/mobile.log"

mkdir -p "${LOG_DIR}" "${PID_DIR}"
cd "${ROOT_DIR}"
touch "${LOG_FILE}"

log() {
  printf '%s\n' "$1" | tee -a "${LOG_FILE}"
}

if [[ "${BIOTRACK_AUTOSTART_MOBILE:-true}" != "true" ]]; then
  log "Mobile autostart disabled (BIOTRACK_AUTOSTART_MOBILE=${BIOTRACK_AUTOSTART_MOBILE})."
  exit 0
fi

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

FLUTTER_BIN=""
if ! FLUTTER_BIN="$(find_flutter_bin)"; then
  log "Flutter is unavailable in this container. Skipping mobile autostart."
  exit 0
fi

is_running() {
  if [[ ! -f "${PID_FILE}" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "${PID_FILE}")"
  if [[ -z "${pid}" ]]; then
    rm -f "${PID_FILE}"
    return 1
  fi

  if kill -0 "${pid}" >/dev/null 2>&1; then
    return 0
  fi

  rm -f "${PID_FILE}"
  return 1
}

if is_running; then
  log "mobile already running (pid $(cat "${PID_FILE}"))."
  exit 0
fi

DEVICE_ID="${MOBILE_DEVICE_ID:-}"
DEVICES_JSON="$("${FLUTTER_BIN}" devices --machine 2>/dev/null || true)"

if [[ -z "${DEVICE_ID}" ]]; then
  DEVICE_ID="$(
    printf '%s' "${DEVICES_JSON}" \
      | tr '{' '\n' \
      | sed -n 's/.*"id":"\([^"]*\)".*"targetPlatform":"\([^"]*\)".*/\1 \2/p' \
      | awk '$2 ~ /android|ios/ {print $1; exit}'
  )"
fi

if [[ -z "${DEVICE_ID}" ]]; then
  log "No Android/iOS device detected. Skipping mobile autostart."
  log "Connect a device, then run: bash .devcontainer/scripts/start-mobile.sh"
  exit 0
fi

API_BASE_URL="${MOBILE_API_BASE_URL:-http://127.0.0.1:3000}"
MOBILE_COMMAND="\"${FLUTTER_BIN}\" run -d ${DEVICE_ID} --dart-define=API_BASE_URL=${API_BASE_URL}"

log "Starting mobile on device ${DEVICE_ID}..."
nohup bash -lc "${MOBILE_COMMAND}" >"${LOG_FILE}" 2>&1 &
echo "$!" >"${PID_FILE}"

sleep 2
if ! is_running; then
  log "mobile failed to start. Check ${LOG_FILE}"
  exit 1
fi

log "mobile started (pid $(cat "${PID_FILE}"))."
