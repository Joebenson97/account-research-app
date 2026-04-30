# Backup & Recovery Strategy

This document covers how to protect your PostgreSQL data, automate backups, and recover from different failure scenarios.

---

## Overview

The app uses three layers of data protection:

| Layer | Protects Against | Recovery Time |
|-------|-----------------|---------------|
| **Soft delete** | Accidental user deletions | Instant (single SQL query) |
| **pg_dump backups** | Database corruption, bad deploys, schema errors | Minutes |
| **Automated schedule** | Forgetting to back up manually | Automatic (daily) |

---

## Quick Reference

```bash
# Create a backup right now
npm run db:backup

# List available backups
npm run db:restore -- --list

# Restore the most recent backup
npm run db:restore -- --latest

# Recover a soft-deleted account
npm run db:recover -- --list                         # see what's deleted
npm run db:recover -- --recover ACCOUNT_ID           # recover one
npm run db:recover -- --recover-since "2026-04-29"   # recover by date
```

---

## 1. Manual Backups

### Creating a Backup

```bash
./scripts/backup.sh
```

This creates a compressed SQL dump at `backups/account_research_YYYYMMDD_HHMMSS.sql.gz`. The script:

1. Connects to PostgreSQL using `DATABASE_URL` (or `PG*` environment variables)
2. Runs `pg_dump` with `--clean --if-exists` so the dump can fully recreate the database
3. Compresses with gzip (typically 10-50x smaller than raw SQL)
4. Verifies the backup is non-empty and contains `CREATE TABLE` statements
5. Deletes backups older than `BACKUP_RETENTION_DAYS` (default: 7 days)

### Customizing Backup Location and Retention

```bash
# Store backups on an external volume
BACKUP_DIR=/mnt/backups ./scripts/backup.sh

# Keep 30 days of backups instead of 7
BACKUP_RETENTION_DAYS=30 ./scripts/backup.sh
```

### What's in a Backup

Each backup contains:
- **Full schema**: All `CREATE TABLE` statements (accounts, users)
- **All data**: Every row, including soft-deleted accounts
- **No ownership/privileges**: Uses `--no-owner --no-privileges` so it restores cleanly to any user

---

## 2. Automated Backups (Cron)

### Setting Up Daily Backups

Add a cron job to run backups automatically:

```bash
# Open crontab editor
crontab -e

# Add this line — runs daily at 2:00 AM
0 2 * * * cd /path/to/account-research-app && ./scripts/backup.sh >> /var/log/account-research-backup.log 2>&1
```

### Recommended Schedule

| Environment | Schedule | Retention | Notes |
|-------------|----------|-----------|-------|
| Development | Manual only | 3 days | Run before risky changes |
| Staging | Daily | 7 days | Catch issues before production |
| Production | Every 6 hours | 30 days | Minimize data loss window |

For production (every 6 hours):
```bash
0 */6 * * * cd /path/to/account-research-app && BACKUP_RETENTION_DAYS=30 ./scripts/backup.sh >> /var/log/account-research-backup.log 2>&1
```

### Monitoring Backups

Check that backups are running:
```bash
# List recent backups
ls -lht backups/

# Check cron log
tail -20 /var/log/account-research-backup.log

# Verify backup integrity
./scripts/restore.sh --dry-run backups/account_research_20260429_020000.sql.gz
```

---

## 3. Restoring from Backup

### Full Database Restore

```bash
# Restore a specific backup
./scripts/restore.sh backups/account_research_20260429_020000.sql.gz

# Restore the most recent backup
./scripts/restore.sh --latest
```

The restore script:
1. Asks for confirmation (this **overwrites** existing data)
2. Runs the SQL dump inside a single transaction (atomic — all or nothing)
3. Verifies the restore by counting accounts and users

### Preview Before Restoring

```bash
# See what's in the backup without applying it
./scripts/restore.sh --dry-run backups/account_research_20260429_020000.sql.gz
```

### Single-Table Restore

If only one table is corrupted, you can restore just that table:

```bash
./scripts/restore.sh --table accounts backups/account_research_20260429_020000.sql.gz
```

---

## 4. Recovering Soft-Deleted Accounts

Since the app uses soft delete (`deletedAt` timestamp), deleted accounts are never actually removed from the database. This is the fastest recovery path for accidental deletions.

### List Deleted Accounts

```bash
./scripts/recover-deleted.sh --list
```

Output:
```
                  id                  |       name       |  status  |        deletedAt
--------------------------------------+------------------+----------+--------------------------
 22a010e4-3ed3-4c6f-af26-15a222a2b8db | E2E Test Account | active   | 2026-04-29T14:02:02.439Z
```

### Recover a Specific Account

```bash
./scripts/recover-deleted.sh --recover 22a010e4-3ed3-4c6f-af26-15a222a2b8db
```

### Recover Everything Deleted After a Date

If a bug mass-deleted accounts, recover them all at once:

```bash
./scripts/recover-deleted.sh --recover-since "2026-04-29"
```

### Recover All Deleted Accounts

```bash
./scripts/recover-deleted.sh --recover-all
```

---

## 5. Recovery Scenarios

### Scenario A: User accidentally deletes an account

**Impact**: One account missing from dashboard  
**Recovery time**: < 1 minute  
**Steps**:
1. Run `./scripts/recover-deleted.sh --list` to find the account
2. Run `./scripts/recover-deleted.sh --recover ACCOUNT_ID`
3. Refresh the app — account reappears immediately

**Why this works**: Soft delete only sets `deletedAt`; the row is still in the database.

### Scenario B: Bug mass-deletes accounts

**Impact**: Many/all accounts disappear  
**Recovery time**: < 1 minute  
**Steps**:
1. Run `./scripts/recover-deleted.sh --recover-since "YYYY-MM-DD"` with today's date
2. Verify with `./scripts/recover-deleted.sh --list` (should show 0 deleted)

**Why this works**: Soft delete preserves all data. Bulk recovery is a single UPDATE.

### Scenario C: Bad deploy corrupts data (wrong values, broken schema)

**Impact**: App shows incorrect data or errors  
**Recovery time**: 2-5 minutes  
**Steps**:
1. Stop the app: `kill $(lsof -ti:3000)` or stop the process
2. Restore from backup: `./scripts/restore.sh --latest`
3. Restart the app: `npm run dev`
4. Verify data is correct

**Why this works**: `pg_dump` captures the full schema + data. Restoring replaces everything.

### Scenario D: Database server crashes or disk failure

**Impact**: Complete data loss on that server  
**Recovery time**: 10-30 minutes (depends on new server setup)  
**Steps**:
1. Set up a new PostgreSQL server
2. Create the database and user:
   ```bash
   sudo -u postgres psql -c "CREATE DATABASE account_research;"
   sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD 'apppassword';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE account_research TO appuser;"
   sudo -u postgres psql -d account_research -c "GRANT ALL ON SCHEMA public TO appuser;"
   ```
3. Copy a backup file to the new server
4. Run `./scripts/restore.sh BACKUP_FILE`
5. Update `DATABASE_URL` if the host changed
6. Restart the app

**Data loss**: Limited to changes made since the last backup. With 6-hour backups, maximum 6 hours of data loss.

### Scenario E: Need to roll back a bad migration

**Impact**: Schema changed in a way that breaks the app  
**Recovery time**: 2-5 minutes  
**Steps**:
1. Take a backup BEFORE any migration: `./scripts/backup.sh`
2. Run the migration
3. If it fails, restore: `./scripts/restore.sh --latest`

**Best practice**: Always back up before schema changes.

---

## 6. Production Recommendations

### Off-Site Backup Storage

Local backups protect against data corruption but not hardware failure. For production, copy backups to a remote location:

```bash
# After backup, sync to S3
aws s3 sync backups/ s3://your-bucket/account-research-backups/ --storage-class STANDARD_IA

# Or use rsync to a remote server
rsync -avz backups/ backup-server:/backups/account-research/
```

### Managed PostgreSQL (Recommended for Production)

If you deploy to a managed PostgreSQL service, you get automatic backups for free:

| Provider | Automatic Backups | Point-in-Time Recovery | Setup |
|----------|------------------|----------------------|-------|
| **AWS RDS** | Daily snapshots, 35-day retention | Yes (5-min granularity) | Enable in RDS console |
| **Supabase** | Daily backups (Pro plan) | Yes (Pro plan) | Automatic |
| **Neon** | Continuous branching | Yes (branch from any point) | Automatic |
| **Railway** | Daily backups | No | Automatic |
| **Render** | Daily backups | No | Enable in dashboard |

With managed PostgreSQL, you still want the `scripts/backup.sh` as an additional safety net — don't rely solely on the provider.

### Backup Verification Checklist

Run monthly in production:

- [ ] Verify backups are being created (check `backups/` directory or cron log)
- [ ] Verify backup file sizes are reasonable (not 0 bytes, not shrinking)
- [ ] Test a restore to a separate database to confirm backups are valid
- [ ] Verify off-site copies are up to date
- [ ] Review retention policy (is 7/30 days enough?)

---

## 7. Environment Variables

All scripts use the same configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | Full connection string (overrides individual vars) |
| `PGHOST` | `localhost` | PostgreSQL host |
| `PGPORT` | `5432` | PostgreSQL port |
| `PGUSER` | `appuser` | PostgreSQL user |
| `PGPASSWORD` | `apppassword` | PostgreSQL password |
| `PGDATABASE` | `account_research` | Database name |
| `BACKUP_DIR` | `./backups` | Where to store backup files |
| `BACKUP_RETENTION_DAYS` | `7` | Auto-delete backups older than this |
