#!/usr/bin/env bash
#
# PostgreSQL backup script for the account_research database.
#
# Creates timestamped compressed backups using pg_dump. Keeps the last N backups
# and removes older ones automatically (retention policy).
#
# Usage:
#   ./scripts/backup.sh                    # uses defaults
#   BACKUP_DIR=/mnt/backups ./scripts/backup.sh
#   BACKUP_RETENTION_DAYS=30 ./scripts/backup.sh
#
# Environment variables:
#   DATABASE_URL          — PostgreSQL connection string (required, or set individual vars)
#   PGHOST                — PostgreSQL host       (default: localhost)
#   PGPORT                — PostgreSQL port       (default: 5432)
#   PGUSER                — PostgreSQL user       (default: appuser)
#   PGPASSWORD            — PostgreSQL password   (default: apppassword)
#   PGDATABASE            — Database name         (default: account_research)
#   BACKUP_DIR            — Where to store backups (default: ./backups)
#   BACKUP_RETENTION_DAYS — Delete backups older than this (default: 7)

set -euo pipefail

# --- Configuration -----------------------------------------------------------

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Parse DATABASE_URL if set, otherwise use individual vars
if [ -n "${DATABASE_URL:-}" ]; then
  export PGHOST="$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')"
  export PGPORT="$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')"
  export PGUSER="$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')"
  export PGPASSWORD="$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')"
  export PGDATABASE="$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')"
else
  export PGHOST="${PGHOST:-localhost}"
  export PGPORT="${PGPORT:-5432}"
  export PGUSER="${PGUSER:-appuser}"
  export PGPASSWORD="${PGPASSWORD:-apppassword}"
  export PGDATABASE="${PGDATABASE:-account_research}"
fi

# --- Helpers ------------------------------------------------------------------

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${PGDATABASE}_${TIMESTAMP}.sql.gz"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# --- Pre-flight checks --------------------------------------------------------

if ! command -v pg_dump &>/dev/null; then
  log "ERROR: pg_dump not found. Install postgresql-client."
  exit 1
fi

# Verify connection
if ! pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" &>/dev/null; then
  log "ERROR: Cannot connect to PostgreSQL at ${PGHOST}:${PGPORT}/${PGDATABASE}"
  exit 1
fi

# --- Create backup ------------------------------------------------------------

mkdir -p "$BACKUP_DIR"

log "Starting backup of ${PGDATABASE}..."
log "  Host: ${PGHOST}:${PGPORT}"
log "  Output: ${BACKUP_FILE}"

pg_dump \
  --host="$PGHOST" \
  --port="$PGPORT" \
  --username="$PGUSER" \
  --dbname="$PGDATABASE" \
  --format=plain \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip > "$BACKUP_FILE"

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup complete: ${BACKUP_FILE} (${FILESIZE})"

# --- Verify backup is not empty -----------------------------------------------

if [ ! -s "$BACKUP_FILE" ]; then
  log "ERROR: Backup file is empty. Something went wrong."
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Quick integrity check: decompress and look for CREATE TABLE
if ! zcat "$BACKUP_FILE" | grep -q "CREATE TABLE"; then
  log "WARNING: Backup may be incomplete (no CREATE TABLE found)."
fi

# --- Retention cleanup --------------------------------------------------------

log "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "${PGDATABASE}_*.sql.gz" -mtime "+${BACKUP_RETENTION_DAYS}" -delete -print | wc -l)
log "Deleted ${DELETED} old backup(s)."

# --- Summary ------------------------------------------------------------------

TOTAL=$(find "$BACKUP_DIR" -name "${PGDATABASE}_*.sql.gz" | wc -l)
log "Total backups on disk: ${TOTAL}"
log "Done."
