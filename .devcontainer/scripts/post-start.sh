#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME_DIR="${ROOT_DIR}/.devcontainer/.runtime"
LOG_DIR="${RUNTIME_DIR}/logs"
PID_DIR="${RUNTIME_DIR}/pids"

mkdir -p "${LOG_DIR}" "${PID_DIR}"
cd "${ROOT_DIR}"

is_running() {
  local pid_file="$1"

  if [[ ! -f "${pid_file}" ]]; then
    return 1
  fi

  local pid
  pid="$(cat "${pid_file}")"
  if [[ -z "${pid}" ]]; then
    rm -f "${pid_file}"
    return 1
  fi

  if kill -0 "${pid}" >/dev/null 2>&1; then
    return 0
  fi

  rm -f "${pid_file}"
  return 1
}

start_service() {
  local name="$1"
  local command="$2"
  local pid_file="${PID_DIR}/${name}.pid"
  local log_file="${LOG_DIR}/${name}.log"

  if is_running "${pid_file}"; then
    echo "${name} already running (pid $(cat "${pid_file}"))."
    return 0
  fi

  echo "Starting ${name}..."
  nohup bash -lc "${command}" >"${log_file}" 2>&1 &
  echo "$!" >"${pid_file}"

  sleep 2
  if ! is_running "${pid_file}"; then
    echo "${name} failed to start. Check ${log_file}"
    return 1
  fi
}

start_service "backend" "npm run dev:backend"
start_service "web" "npm --workspace web run dev -- --hostname 0.0.0.0 --port 3001 --webpack"
bash ".devcontainer/scripts/start-mobile.sh" || true

echo "Auto-start complete."
echo "Logs: ${LOG_DIR}"
