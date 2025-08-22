#!/usr/bin/env bash

# Dev database reset script for PostgreSQL + PostGIS
# - Drops PostGIS extensions (and their views like geography_columns, geometry_columns, spatial_ref_sys)
# - Drops and recreates the public schema
# - Leaves the database empty so migrations can recreate everything cleanly
#
# Safe by default: requires confirmation unless -y/--yes is passed.

set -euo pipefail

# Load .env if present (non-fatal if missing)
if [ -f .env ]; then
  # shellcheck disable=SC1091
  source .env
fi

# Defaults aligned with server/database/connection.ts
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_NAME="${DB_NAME:-generative_world}"
DB_USERNAME="${DB_USERNAME:-generative_world_user}"
DB_PASSWORD="${DB_PASSWORD:-generative_world_pass}"

RUN_MIGRATIONS=false
ASSUME_YES=false

print_usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  -y, --yes            Do not prompt for confirmation
  -m, --migrate        Run migrations after reset (pnpm drizzle-kit migrate)
  -h, --help           Show this help

Environment variables (with defaults):
  DB_HOST=${DB_HOST}
  DB_PORT=${DB_PORT}
  DB_NAME=${DB_NAME}
  DB_USERNAME=${DB_USERNAME}
  DB_PASSWORD=********

Notes:
  - This is a destructive operation intended for local development only.
  - It will drop PostGIS extensions and the entire public schema.
  - Your migrations will recreate the PostGIS extension and all tables.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -y|--yes)
      ASSUME_YES=true
      shift
      ;;
    -m|--migrate)
      RUN_MIGRATIONS=true
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      print_usage
      exit 1
      ;;
  esac
done

echo "⚠️  You are about to RESET the database:"
# Avoid printing password
echo "    postgresql://${DB_USERNAME}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "    This will DROP PostGIS and ALL objects in schema 'public'."

if [ "$ASSUME_YES" = false ]; then
  read -r -p "Type 'reset' to continue: " CONFIRM
  if [ "$CONFIRM" != "reset" ]; then
    echo "Aborted."; exit 1
  fi
fi

export PGPASSWORD="$DB_PASSWORD"

PSQL_BASE=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q)

echo "\n🔌 Checking connection..."
"${PSQL_BASE[@]}" -c "SELECT version();" >/dev/null
echo "✅ Connected"

echo "\n🧹 Dropping PostGIS extensions if present..."
"${PSQL_BASE[@]}" <<'SQL'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis_topology') THEN
    RAISE NOTICE 'Dropping extension postgis_topology CASCADE';
    EXECUTE 'DROP EXTENSION IF EXISTS postgis_topology CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis_tiger_geocoder') THEN
    RAISE NOTICE 'Dropping extension postgis_tiger_geocoder CASCADE';
    EXECUTE 'DROP EXTENSION IF EXISTS postgis_tiger_geocoder CASCADE';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE NOTICE 'Dropping extension postgis CASCADE';
    EXECUTE 'DROP EXTENSION IF EXISTS postgis CASCADE';
  END IF;
END$$;
SQL
echo "✅ PostGIS extensions dropped (if they existed)"

echo "\n🔨 Dropping and recreating schema public..."
"${PSQL_BASE[@]}" <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO CURRENT_USER;
GRANT ALL ON SCHEMA public TO PUBLIC;
COMMENT ON SCHEMA public IS 'standard public schema';
SQL
echo "✅ Schema public reset"

echo "\n� Ensuring required extensions for migrations (pgcrypto for gen_random_uuid)..."
"${PSQL_BASE[@]}" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SQL
echo "✅ Extensions ensured"

echo "\n🗂️  Dropping Drizzle migrations tracking table (drizzle.__drizzle_migrations) if present..."
"${PSQL_BASE[@]}" <<'SQL'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'drizzle') THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'drizzle' AND c.relname = '__drizzle_migrations' AND c.relkind = 'r'
    ) THEN
      EXECUTE 'DROP TABLE IF EXISTS drizzle.__drizzle_migrations';
    END IF;
  END IF;
END$$;
SQL
echo "✅ Drizzle migrations table dropped (if it existed)"

echo "\n�🧾 Vacuuming and analyzing..."
"${PSQL_BASE[@]}" -c "VACUUM FULL; ANALYZE;" >/dev/null || true
echo "✅ Maintenance done"

if [ "$RUN_MIGRATIONS" = true ]; then
  echo "\n🚀 Running migrations (drizzle-kit migrate)..."
  # Prefer pnpm if available; fallback to npx drizzle-kit
  if command -v pnpm >/dev/null 2>&1; then
    pnpm exec drizzle-kit migrate
  else
    npx drizzle-kit migrate
  fi
  echo "✅ Migrations complete"
else
  echo "\nℹ️  Skipping migrations (pass -m to run them now)."
fi

echo "\n🎉 Reset complete. You can now run migrations or start the app."
