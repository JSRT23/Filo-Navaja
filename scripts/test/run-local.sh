#!/usr/bin/env bash
# Aplica las migraciones, el seed y las pruebas sobre un Postgres local puro.
# Uso: PGHOST=/tmp PGPORT=54329 PGUSER=postgres ./scripts/test/run-local.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB="${TEST_DB:-barberia_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB"
"${PSQL[@]}" -d "$DB" -f "$ROOT/scripts/test/supabase_shim.sql"

for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ $(basename "$f")"
  "${PSQL[@]}" -d "$DB" -f "$f"
done

if [[ "${SKIP_SEED:-0}" != "1" ]]; then
  echo "→ seeds"
  for s in "$ROOT"/supabase/seeds/*.sql; do "${PSQL[@]}" -d "$DB" -f "$s"; done
fi

if [[ "${SKIP_TESTS:-0}" != "1" ]]; then
  for t in "$ROOT"/scripts/test/sql/*.sql; do
    echo "→ prueba $(basename "$t")"
    "${PSQL[@]}" -d "$DB" -f "$t"
  done
fi
echo "✔ Todo aplicado correctamente"
