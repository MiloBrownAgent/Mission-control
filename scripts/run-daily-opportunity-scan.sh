#!/bin/zsh
set -euo pipefail

ROOT="/Users/milo/Projects/mission-control"
LOG_DIR="$ROOT/logs"
LOG_FILE="$LOG_DIR/daily-opportunity-scan.log"
LOCK_DIR="/tmp/mission-control-daily-opportunity-scan.lock"
NODE_BIN="/opt/homebrew/bin/node"
if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node)"
fi
TS="$(date '+%Y-%m-%d %H:%M:%S')"

mkdir -p "$LOG_DIR"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "[$TS] skip: scan already running" >> "$LOG_FILE"
  exit 0
fi
trap 'rmdir "$LOCK_DIR"' EXIT

cd "$ROOT"

echo "[$TS] start" >> "$LOG_FILE"
"$NODE_BIN" scripts/daily-opportunity-scan.js >> "$LOG_FILE" 2>&1
"$NODE_BIN" scripts/investment-home-refresh.js >> "$LOG_FILE" 2>&1

echo "[$(date '+%Y-%m-%d %H:%M:%S')] done" >> "$LOG_FILE"
