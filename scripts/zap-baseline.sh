#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-http://127.0.0.1:3001}"
REPORT_DIR="${2:-docs/zap}"
REPORT_NAME="${3:-zap-baseline}"
ZAP_IMAGE="${ZAP_IMAGE:-owasp/zap2docker-stable}"

if [[ "$REPORT_DIR" = /* ]]; then
  echo "Report dir must be relative to repo root (example: docs/zap)" >&2
  exit 2
fi

mkdir -p "$REPORT_DIR"

docker run --rm -t \
  -u "$(id -u):$(id -g)" \
  -v "$(pwd)":/zap/wrk \
  "$ZAP_IMAGE" \
  zap-baseline.py \
  -t "$TARGET_URL" \
  -r "$REPORT_DIR/$REPORT_NAME.html" \
  -J "$REPORT_DIR/$REPORT_NAME.json" \
  -w "$REPORT_DIR/$REPORT_NAME.md"
