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

# Load CRE scanner env vars
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

# Fallback defaults
export CONVEX_URL="${CONVEX_URL:-https://proper-rat-443.convex.site}"
export CONVEX_CRE_TOKEN="${CONVEX_CRE_TOKEN:-cre-ingest-token}"

# Pull Anthropic API key from OpenClaw auth profiles if not set
if [ -z "$ANTHROPIC_API_KEY" ]; then
  ANTHROPIC_API_KEY=$(/opt/homebrew/bin/python3 -c "
import json
with open('$HOME/.openclaw/agents/infrastructure/agent/auth-profiles.json') as f:
    d = json.load(f)
print(d['profiles']['anthropic:default']['token'])
" 2>/dev/null)
  export ANTHROPIC_API_KEY
fi

cd "$SCRIPT_DIR"

# Ensure playwright browsers are available (no-op if already installed)
/opt/homebrew/bin/python3 -m playwright install chromium 2>/dev/null || true

/opt/homebrew/bin/python3 scanner.py

echo "=== CRE Scanner Complete: $(date) ==="
