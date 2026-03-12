#!/bin/zsh
set -euo pipefail

ROOT="/Users/milo/Projects/mission-control"
LOG_DIR="$ROOT/logs"
LOG_FILE="$LOG_DIR/daily-opportunity-scan.log"
LOCK_DIR="/tmp/mission-control-daily-opportunity-scan.lock"
LOCK_PID_FILE="$LOCK_DIR/pid"
NODE_BIN="/opt/homebrew/bin/node"
PYTHON_BIN="/usr/bin/python3"
if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN="$(command -v node)"
fi
TS="$(date '+%Y-%m-%d %H:%M:%S')"

mkdir -p "$LOG_DIR"

acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo $$ > "$LOCK_PID_FILE"
    return 0
  fi

  if [ -f "$LOCK_PID_FILE" ]; then
    local existing_pid
    existing_pid="$(cat "$LOCK_PID_FILE" 2>/dev/null || true)"
    if [ -n "$existing_pid" ] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "[$TS] skip: scan already running (pid $existing_pid)" >> "$LOG_FILE"
      return 1
    fi
  fi

  echo "[$TS] stale lock detected — clearing" >> "$LOG_FILE"
  rm -rf "$LOCK_DIR"
  mkdir "$LOCK_DIR"
  echo $$ > "$LOCK_PID_FILE"
  return 0
}

cleanup() {
  local exit_code=$?
  rm -f "$LOCK_PID_FILE" 2>/dev/null || true
  rmdir "$LOCK_DIR" 2>/dev/null || true
  if [ $exit_code -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] done" >> "$LOG_FILE"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] failed (exit $exit_code)" >> "$LOG_FILE"
  fi
}
trap cleanup EXIT

if ! acquire_lock; then
  exit 0
fi

run_with_timeout() {
  local seconds="$1"
  shift
  "$PYTHON_BIN" - "$seconds" "$@" <<'PY'
import subprocess
import sys

timeout = int(sys.argv[1])
cmd = sys.argv[2:]
try:
    result = subprocess.run(cmd, timeout=timeout)
    raise SystemExit(result.returncode)
except subprocess.TimeoutExpired:
    print(f"timeout after {timeout}s: {' '.join(cmd)}", file=sys.stderr)
    raise SystemExit(124)
PY
}

run_step() {
  local label="$1"
  local timeout_seconds="$2"
  shift 2
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] start: $label" >> "$LOG_FILE"
  if run_with_timeout "$timeout_seconds" "$@" >> "$LOG_FILE" 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ok: $label" >> "$LOG_FILE"
    return 0
  fi

  local exit_code=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] failed: $label (exit $exit_code)" >> "$LOG_FILE"
  return $exit_code
}

cd "$ROOT"

echo "[$TS] start" >> "$LOG_FILE"
run_step "daily-opportunity-scan" 240 "$NODE_BIN" scripts/daily-opportunity-scan.js
run_step "investment-home-refresh" 180 "$NODE_BIN" scripts/investment-home-refresh.js
