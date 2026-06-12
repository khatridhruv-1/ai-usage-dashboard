#!/usr/bin/env bash
# Scheduled GitHub Actions only run inside the expected Asia/Kolkata window.
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

if [ "$MODE" = "cursor" ]; then
  if [ "$DOW" -gt 5 ]; then
    echo "Skip: weekend in Asia/Kolkata (dow=$DOW)"
    exit 1
  fi
  if [ "$H" != "19" ] || [ "$M" -lt 28 ] || [ "$M" -gt 32 ]; then
    echo "Skip: outside 7:30 PM IST window (now ${H}:${M} IST)"
    exit 1
  fi
elif [ "$MODE" = "daily" ]; then
  if [ "$H" != "19" ] || [ "$M" -gt 10 ]; then
    echo "Skip: outside 7:00 PM IST window (now ${H}:${M} IST)"
    exit 1
  fi
fi

echo "IST schedule OK (${H}:${M}, dow=${DOW})"
