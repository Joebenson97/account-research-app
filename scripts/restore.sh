#!/usr/bin/env bash
#
# PostgreSQL restore script for the account_research database.
#
# Restores from a compressed backup created by backup.sh.
# Supports full restore (drop & recreate) and data-only restore.
#
# Usage:
#   ./scripts/restore.sh backups/account_research_20260429_140000.sql.gz
#   ./scripts/restore.sh --list                         # list available backups
#   ./scripts/restore.sh --latest                       # restore most recent backup
#   ./scripts/restore.sh --dry-run BACKUP_FILE          # preview without applying
#   ./scripts/restore.sh --table accounts BACKUP_FILE   # restore a single table
#
# Environment variables: same as backup.sh (DATABASE_URL or PG* vars)

set -euo pipefail

# --- Configuration -----------------------------------------------------------

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"

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

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

usage() {
  echo "Usage: $0 [OPTIONS] [BACKUP_FILE]"
  echo ""
  echo "Options:"
  echo "  --list           List available backups"
  echo "  --latest         Restore the most recent backup"
  echo "  --dry-run FILE   Preview the restore without applying"
  echo "  --table NAME FILE  Restore only the specified table"
  echo "  -h, --help       Show this help"
  exit 0
}

list_backups() {
  log "Available backups in ${BACKUP_DIR}:"
  if [ -d "$BACKUP_DIR" ]; then
    ls -lhtr "$BACKUP_DIR"/${PGDATABASE}_*.sql.gz 2>/dev/null || echo "  (none found)"
  else
    echo "  Backup directory does not exist: ${BACKUP_DIR}"
  fi
  exit 0
}

# --- Parse arguments ----------------------------------------------------------

DRY_RUN=false
LATEST=false
TABLE=""
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list) list_backups ;;
    --latest) LATEST=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --table) TABLE="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) BACKUP_FILE="$1"; shift ;;
  esac
done

# Resolve --latest to the newest backup file
if [ "$LATEST" = true ]; then
  BACKUP_FILE=$(ls -t "$BACKUP_DIR"/${PGDATABASE}_*.sql.gz 2>/dev/null | head -1)
  if [ -z "$BACKUP_FILE" ]; then
    log "ERROR: No backups found in ${BACKUP_DIR}"
    exit 1
  fi
  log "Using latest backup: ${BACKUP_FILE}"
fi

if [ -z "$BACKUP_FILE" ]; then
  log "ERROR: No backup file specified. Use --list to see available backups."
  usage
fi

if [ ! -f "$BACKUP_FILE" ]; then
  log "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# --- Pre-flight checks --------------------------------------------------------

if ! command -v psql &>/dev/null; then
  log "ERROR: psql not found. Install postgresql-client."
  exit 1
fi

if ! pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" &>/dev/null; then
  log "ERROR: Cannot connect to PostgreSQL at ${PGHOST}:${PGPORT}/${PGDATABASE}"
  exit 1
fi

# --- Dry run ------------------------------------------------------------------

if [ "$DRY_RUN" = true ]; then
  log "DRY RUN — showing first 50 lines of backup (not applying):"
  echo "---"
  zcat "$BACKUP_FILE" | head -50
  echo "---"
  LINES=$(zcat "$BACKUP_FILE" | wc -l)
  TABLES=$(zcat "$BACKUP_FILE" | grep -c "CREATE TABLE" || true)
  log "Backup contains ${LINES} lines, ${TABLES} CREATE TABLE statement(s)."
  exit 0
fi

# --- Confirmation -------------------------------------------------------------

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "About to restore ${PGDATABASE} from:"
log "  File: ${BACKUP_FILE} (${FILESIZE})"
log "  Target: ${PGHOST}:${PGPORT}/${PGDATABASE}"
if [ -n "$TABLE" ]; then
  log "  Table: ${TABLE} only"
fi

echo ""
read -p "This will overwrite existing data. Continue? [y/N] " -r CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  log "Aborted."
  exit 0
fi

# --- Restore ------------------------------------------------------------------

log "Restoring..."

if [ -n "$TABLE" ]; then
  # Single-table restore: extract only the relevant section
  log "Extracting and restoring table '${TABLE}'..."
  zcat "$BACKUP_FILE" \
    | sed -n "/^-- Data for Name: ${TABLE}/,/^--$/p" \
    | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" --single-transaction
else
  # Full restore
  zcat "$BACKUP_FILE" \
    | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" --single-transaction
fi

# --- Verify -------------------------------------------------------------------

log "Verifying restore..."
ACCOUNT_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
  "SELECT COUNT(*) FROM accounts WHERE \"deletedAt\" IS NULL;" 2>/dev/null || echo "?")
USER_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
  "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "?")

log "Restore complete."
log "  Active accounts: ${ACCOUNT_COUNT}"
log "  Users: ${USER_COUNT}"
log "Done."
