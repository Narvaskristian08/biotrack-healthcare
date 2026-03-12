#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="${ZAP_REPORT_DIR:-docs/zap}"
REPORT_STAMP="${ZAP_REPORT_STAMP:-$(date +%Y%m%d-%H%M%S)}"
WEB_URL="${ZAP_WEB_URL:-http://127.0.0.1:3001}"
API_URL="${ZAP_API_URL:-http://127.0.0.1:3000/api}"

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
REPORT_DIR_ABS="$REPO_ROOT/$REPORT_DIR"
WEB_LATEST_HTML="$REPORT_DIR_ABS/zap-web-baseline-latest.html"
WEB_LATEST_JSON="$REPORT_DIR_ABS/zap-web-baseline-latest.json"
WEB_LATEST_MD="$REPORT_DIR_ABS/zap-web-baseline-latest.md"
WEB_RUN_HTML="$REPORT_DIR_ABS/$REPORT_STAMP/zap-web-baseline.html"
WEB_RUN_JSON="$REPORT_DIR_ABS/$REPORT_STAMP/zap-web-baseline.json"
WEB_RUN_MD="$REPORT_DIR_ABS/$REPORT_STAMP/zap-web-baseline.md"
API_LATEST_HTML="$REPORT_DIR_ABS/zap-api-baseline-latest.html"
API_LATEST_JSON="$REPORT_DIR_ABS/zap-api-baseline-latest.json"
API_LATEST_MD="$REPORT_DIR_ABS/zap-api-baseline-latest.md"
API_RUN_HTML="$REPORT_DIR_ABS/$REPORT_STAMP/zap-api-baseline.html"
API_RUN_JSON="$REPORT_DIR_ABS/$REPORT_STAMP/zap-api-baseline.json"
API_RUN_MD="$REPORT_DIR_ABS/$REPORT_STAMP/zap-api-baseline.md"

mkdir -p "$REPORT_DIR_ABS"

require_docker || exit $?

web_status=0
api_status=0

ZAP_REPORT_STAMP="$REPORT_STAMP" bash "$SCRIPT_DIR/zap-baseline.sh" "$WEB_URL" "$REPORT_DIR" "zap-web-baseline" || web_status=$?
ZAP_REPORT_STAMP="$REPORT_STAMP" bash "$SCRIPT_DIR/zap-baseline.sh" "$API_URL" "$REPORT_DIR" "zap-api-baseline" || api_status=$?

generated_at="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
web_has_report=0
api_has_report=0

if [[ -f "$WEB_RUN_HTML" || -f "$WEB_RUN_JSON" || -f "$WEB_RUN_MD" ]]; then
  web_has_report=1
fi
if [[ -f "$API_RUN_HTML" || -f "$API_RUN_JSON" || -f "$API_RUN_MD" ]]; then
  api_has_report=1
fi

if (( web_has_report == 0 && api_has_report == 0 )); then
  echo "No ZAP report artifacts were generated. Dashboard not written." >&2
  exit_code="$web_status"
  if (( api_status > exit_code )); then
    exit_code="$api_status"
  fi
  exit "$exit_code"
fi

node "$SCRIPT_DIR/render-zap-dashboard.mjs" \
  --report-dir "$REPORT_DIR" \
  --stamp "$REPORT_STAMP" \
  --generated-at "$generated_at" \
  --web-target "$WEB_URL" \
  --api-target "$API_URL" \
  --web-status "$web_status" \
  --api-status "$api_status"

printf 'ZAP dashboard: %s/index.html\n' "$REPORT_DIR"

exit_code="$web_status"
if (( api_status > exit_code )); then
  exit_code="$api_status"
fi

exit "$exit_code"
