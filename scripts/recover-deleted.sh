#!/usr/bin/env bash
#
# Recover soft-deleted accounts from the PostgreSQL database.
#
# Since the app uses soft delete (deletedAt timestamp), "deleted" accounts
# are still in the database. This script helps recover them without restoring
# from backup.
#
# Usage:
#   ./scripts/recover-deleted.sh --list                  # show all soft-deleted accounts
#   ./scripts/recover-deleted.sh --recover ID            # recover a specific account by ID
#   ./scripts/recover-deleted.sh --recover-all           # recover ALL soft-deleted accounts
#   ./scripts/recover-deleted.sh --recover-since "2026-04-29"  # recover accounts deleted after date
#
# Environment variables: same as backup.sh (DATABASE_URL or PG* vars)

set -euo pipefail

# --- Configuration -----------------------------------------------------------

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

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
PG="psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE"

# --- Parse arguments ----------------------------------------------------------

ACTION=""
TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list) ACTION="list"; shift ;;
    --recover) ACTION="recover"; TARGET="$2"; shift 2 ;;
    --recover-all) ACTION="recover-all"; shift ;;
    --recover-since) ACTION="recover-since"; TARGET="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 --list | --recover ID | --recover-all | --recover-since DATE"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [ -z "$ACTION" ]; then
  echo "No action specified. Use --list, --recover ID, --recover-all, or --recover-since DATE."
  exit 1
fi

# --- Actions ------------------------------------------------------------------

case "$ACTION" in
  list)
    log "Soft-deleted accounts:"
    $PG -c "SELECT id, name, status, \"deletedAt\" FROM accounts WHERE \"deletedAt\" IS NOT NULL ORDER BY \"deletedAt\" DESC;"
    COUNT=$($PG -tAc "SELECT COUNT(*) FROM accounts WHERE \"deletedAt\" IS NOT NULL;")
    log "Total soft-deleted: ${COUNT}"
    ;;

  recover)
    log "Recovering account: ${TARGET}"
    RESULT=$($PG -tAc "SELECT name FROM accounts WHERE id = '${TARGET}' AND \"deletedAt\" IS NOT NULL;")
    if [ -z "$RESULT" ]; then
      log "ERROR: No soft-deleted account found with ID '${TARGET}'"
      exit 1
    fi
    log "Found: ${RESULT}"
    $PG -c "UPDATE accounts SET \"deletedAt\" = NULL WHERE id = '${TARGET}';"
    log "Recovered: ${RESULT} (ID: ${TARGET})"
    ;;

  recover-all)
    COUNT=$($PG -tAc "SELECT COUNT(*) FROM accounts WHERE \"deletedAt\" IS NOT NULL;")
    if [ "$COUNT" = "0" ]; then
      log "No soft-deleted accounts to recover."
      exit 0
    fi
    log "Recovering ${COUNT} soft-deleted account(s)..."
    read -p "Continue? [y/N] " -r CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
      log "Aborted."
      exit 0
    fi
    $PG -c "UPDATE accounts SET \"deletedAt\" = NULL WHERE \"deletedAt\" IS NOT NULL;"
    log "Recovered ${COUNT} account(s)."
    ;;

  recover-since)
    log "Recovering accounts deleted since: ${TARGET}"
    COUNT=$($PG -tAc "SELECT COUNT(*) FROM accounts WHERE \"deletedAt\" IS NOT NULL AND \"deletedAt\" >= '${TARGET}';")
    if [ "$COUNT" = "0" ]; then
      log "No accounts deleted since ${TARGET}."
      exit 0
    fi
    log "Found ${COUNT} account(s) to recover:"
    $PG -c "SELECT id, name, \"deletedAt\" FROM accounts WHERE \"deletedAt\" IS NOT NULL AND \"deletedAt\" >= '${TARGET}';"
    read -p "Recover all ${COUNT}? [y/N] " -r CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
      log "Aborted."
      exit 0
    fi
    $PG -c "UPDATE accounts SET \"deletedAt\" = NULL WHERE \"deletedAt\" IS NOT NULL AND \"deletedAt\" >= '${TARGET}';"
    log "Recovered ${COUNT} account(s)."
    ;;
esac
