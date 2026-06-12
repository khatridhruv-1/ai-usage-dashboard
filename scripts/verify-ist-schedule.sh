#!/usr/bin/env bash
# Scheduled GitHub Actions only run inside the expected Asia/Kolkata window.
# Windows are wide enough for GitHub cron queue delay (often 5–30+ minutes).
# workflow_dispatch always runs (manual test).
set -euo pipefail

if [ "${GITHUB_EVENT_NAME:-}" != "schedule" ]; then
  exit 0
fi

MODE="${1:?Usage: verify-ist-schedule.sh cursor|daily}"
H=$(TZ=Asia/Kolkata date +%H)
M=$(TZ=Asia/Kolkata date +%M)
DOW=$(TZ=Asia/Kolkata date +%u)
H=$((10#$H))
M=$((10#$M))
DOW=$((10#$DOW))
TOTAL=$((H * 60 + M))

if [ "$MODE" = "cursor" ]; then
  if [ "$DOW" -gt 5 ]; then
    echo "Skip: weekend in Asia/Kolkata (dow=$DOW)"
    exit 1
  fi
  # Nominal ~7:35 PM IST (cron 14:05 UTC); allow delayed queue starts
  if [ "$TOTAL" -lt $((19 * 60 + 20)) ] || [ "$TOTAL" -gt $((20 * 60 + 15)) ]; then
    echo "Skip: outside 7:20 PM–8:15 PM IST window (now ${H}:${M} IST)"
    exit 1
  fi
elif [ "$MODE" = "daily" ]; then
  # Nominal 7:00 PM IST (cron 13:30 UTC)
  if [ "$TOTAL" -lt $((18 * 60 + 50)) ] || [ "$TOTAL" -gt $((19 * 60 + 45)) ]; then
    echo "Skip: outside 6:50–7:45 PM IST window (now ${H}:${M} IST)"
    exit 1
  fi
fi

echo "IST schedule OK (${H}:${M}, dow=${DOW})"
