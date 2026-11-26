#!/usr/bin/env bash
# Runs every automated check for V2. Database checks need a local PostgreSQL (psql) and are skipped otherwise.
set -euo pipefail
cd "$(dirname "$0")"
for f in integration.js companion.js account.js qr-local.js sw-integrated.js; do node --check "$f"; done
node tests/feeds.mjs
for t in tests/smoke.cjs tests/embedded.cjs tests/patch.cjs tests/test-update-logic.cjs tests/test-gallery.cjs; do node "$t"; done
if command -v psql >/dev/null && [[ -n "${PGTEST_URL:-}" ]]; then
  psql "$PGTEST_URL" -q -v ON_ERROR_STOP=1 -f supabase/tests_supabase_stub.sql
  for m in supabase/migrations/*.sql; do psql "$PGTEST_URL" -q -v ON_ERROR_STOP=1 -1 -f "$m" >/dev/null; done
  psql "$PGTEST_URL" -At -f supabase/tests_security.sql
else
  echo "Database security checks skipped (set PGTEST_URL to an empty local Postgres database to run them)."
fi
echo "All checks passed."
