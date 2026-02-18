#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

export DATABASE_URL="postgresql://hk:devpass@localhost:5432/hafte_kasif"
export JWT_SECRET="dev-jwt-secret-change-in-production"

ROOM_CODE="${1:-}"

if [ -n "$ROOM_CODE" ]; then
  echo "Joining room $ROOM_CODE with 3 bots (you are the 4th player)..."
else
  echo "Starting autonomous 4-bot game..."
fi

exec npx tsx "$PROJECT_DIR/packages/server/src/__tests__/bots/run-bots.ts" $ROOM_CODE
