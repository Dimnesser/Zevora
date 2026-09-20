#!/usr/bin/env bash
# Runs the API suite against a throwaway server and database.
#
# A fresh process matters: the rate limiter keeps its buckets in memory,
# so re-running against a long-lived server eventually trips the
# registration limit and reports false failures.
set -euo pipefail

PORT="${PORT:-3100}"
DB_DIR="$(mktemp -d)"
export ZEVORA_DB_FILE="$DB_DIR/test.db"

# `next start` spawns a child `next-server`, so killing the wrapper alone
# leaves the real listener holding the port. A survivor would keep serving
# the previous run's database and settings, and the next run would silently
# test it instead — so the whole process group goes, and the port is
# checked before anything starts.
cleanup() {
  [[ -n "${SERVER_PID:-}" ]] && kill -- "-$SERVER_PID" 2>/dev/null || true
  rm -rf "$DB_DIR"
}
trap cleanup EXIT

if curl -s -o /dev/null --max-time 2 "http://localhost:$PORT/api/cases"; then
  echo "порт $PORT уже занят — остановите тот процесс или задайте PORT=" >&2
  exit 1
fi

echo "→ сборка"
npx next build >/dev/null

echo "→ запуск сервера на :$PORT (БД: $ZEVORA_DB_FILE)"
setsid npx next start -p "$PORT" >"$DB_DIR/server.log" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 30); do
  if curl -sf "http://localhost:$PORT/api/cases" >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "→ тесты API"
BASE="http://localhost:$PORT" node scripts/test-api.mjs
