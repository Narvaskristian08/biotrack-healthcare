#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_URL="${1:-http://127.0.0.1:3001}"
REPORT_DIR="${2:-docs/zap}"
REPORT_NAME="${3:-zap-baseline}"
ZAP_IMAGE="${ZAP_IMAGE:-ghcr.io/zaproxy/zaproxy:stable}"
REPORT_STAMP="${ZAP_REPORT_STAMP:-$(date +%Y%m%d-%H%M%S)}"
ZAP_HOME="${ZAP_HOME:-/home/zap}"

rewrite_target_url() {
  case "$1" in
    http://127.0.0.1*)
      printf 'http://host.docker.internal%s' "${1#http://127.0.0.1}"
      ;;
    https://127.0.0.1*)
      printf 'https://host.docker.internal%s' "${1#https://127.0.0.1}"
      ;;
    http://localhost*)
      printf 'http://host.docker.internal%s' "${1#http://localhost}"
      ;;
    https://localhost*)
      printf 'https://host.docker.internal%s' "${1#https://localhost}"
      ;;
    *)
      printf '%s' "$1"
      ;;
  esac
}

DOCKER_TARGET_URL="$(rewrite_target_url "$TARGET_URL")"

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker CLI is required to run OWASP ZAP. Install Docker Desktop or Docker Engine first." >&2
    return 127
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon is not available. Start Docker Desktop or ensure the Docker socket is reachable." >&2
    return 125
  fi
}

if [[ "$REPORT_DIR" = /* ]]; then
  echo "Report dir must be relative to repo root (example: docs/zap)" >&2
  exit 2
fi

REPORT_DIR="${REPORT_DIR%/}"
RUN_REPORT_DIR="$REPORT_DIR/$REPORT_STAMP"
RUN_REPORT_DIR_ABS="$REPO_ROOT/$RUN_REPORT_DIR"
LATEST_HTML_ABS="$REPO_ROOT/$REPORT_DIR/$REPORT_NAME-latest.html"
LATEST_JSON_ABS="$REPO_ROOT/$REPORT_DIR/$REPORT_NAME-latest.json"
LATEST_MD_ABS="$REPO_ROOT/$REPORT_DIR/$REPORT_NAME-latest.md"
RUN_HTML_ABS="$RUN_REPORT_DIR_ABS/$REPORT_NAME.html"
RUN_JSON_ABS="$RUN_REPORT_DIR_ABS/$REPORT_NAME.json"
RUN_MD_ABS="$RUN_REPORT_DIR_ABS/$REPORT_NAME.md"

mkdir -p "$RUN_REPORT_DIR_ABS"

require_docker || exit $?

zap_exit_code=0
if [[ -n "${ZAP_DOCKER_USER:-}" ]]; then
  docker run --rm -t \
    -u "$ZAP_DOCKER_USER" \
    -e HOME="$ZAP_HOME" \
    -v "$REPO_ROOT":/zap/wrk \
    -w /zap/wrk \
    "$ZAP_IMAGE" \
    zap-baseline.py \
    -t "$DOCKER_TARGET_URL" \
    -r "$RUN_REPORT_DIR/$REPORT_NAME.html" \
    -J "$RUN_REPORT_DIR/$REPORT_NAME.json" \
    -w "$RUN_REPORT_DIR/$REPORT_NAME.md" || zap_exit_code=$?
else
  docker run --rm -t \
    -e HOME="$ZAP_HOME" \
    -v "$REPO_ROOT":/zap/wrk \
    -w /zap/wrk \
    "$ZAP_IMAGE" \
    zap-baseline.py \
    -t "$DOCKER_TARGET_URL" \
    -r "$RUN_REPORT_DIR/$REPORT_NAME.html" \
    -J "$RUN_REPORT_DIR/$REPORT_NAME.json" \
    -w "$RUN_REPORT_DIR/$REPORT_NAME.md" || zap_exit_code=$?
fi

[[ -f "$RUN_HTML_ABS" ]] && cp "$RUN_HTML_ABS" "$LATEST_HTML_ABS"
[[ -f "$RUN_JSON_ABS" ]] && cp "$RUN_JSON_ABS" "$LATEST_JSON_ABS"
[[ -f "$RUN_MD_ABS" ]] && cp "$RUN_MD_ABS" "$LATEST_MD_ABS"

if [[ ! -f "$RUN_HTML_ABS" || ! -f "$RUN_JSON_ABS" || ! -f "$RUN_MD_ABS" ]]; then
  echo "ZAP did not produce the expected report files for $TARGET_URL." >&2
  exit "${zap_exit_code:-1}"
fi

printf 'Generated ZAP reports for %s\n' "$TARGET_URL"
if [[ "$DOCKER_TARGET_URL" != "$TARGET_URL" ]]; then
  printf 'Docker target: %s\n' "$DOCKER_TARGET_URL"
fi
printf 'Latest HTML: %s/%s-latest.html\n' "$REPORT_DIR" "$REPORT_NAME"
printf 'Run HTML: %s/%s.html\n' "$RUN_REPORT_DIR" "$REPORT_NAME"

exit "$zap_exit_code"
