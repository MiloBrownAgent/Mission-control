#!/bin/bash
# Grove Monthly Prompt Sender
# Runs on 1st of each month at 9 AM CST
# Sends queued prompts to all circle members via email
# Usage: add to system crontab: 0 9 1 * * /Users/milo/Projects/mission-control/scripts/grove-send-prompts.sh

LOG="/tmp/grove-prompts-$(date +%Y%m%d).log"
echo "=== Grove Prompt Send: $(date) ===" >> "$LOG"

/usr/bin/curl -s -X POST https://sweeney.family/api/grove/send-prompts \
  -H "Content-Type: application/json" \
  -d '{"familyId":"sweeney"}' >> "$LOG" 2>&1

echo "" >> "$LOG"
echo "=== Complete: $(date) ===" >> "$LOG"
