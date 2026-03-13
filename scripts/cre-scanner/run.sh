#!/bin/bash
# CRE Scanner - Daily 5am CT
# Crontab entry:
# 0 5 * * * cd /Users/milo/Projects/mission-control && ./scripts/cre-scanner/run.sh >> logs/cre-scanner.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

echo "=== CRE Scanner Run: $(date) ==="

# Source environment
source ~/.zshrc 2>/dev/null || true

# Set required env vars (override in shell env to override defaults)
export CONVEX_URL="${CONVEX_URL:-https://proper-rat-443.convex.cloud}"
export CONVEX_CRE_TOKEN="${CONVEX_CRE_TOKEN:-cre-ingest-token}"

cd "$SCRIPT_DIR"
/opt/homebrew/bin/python3 scanner.py

echo "=== CRE Scanner Complete: $(date) ==="
