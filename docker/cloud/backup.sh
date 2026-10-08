#!/bin/sh
# NicerBase Cloud backups. Usage: backup.sh postgres|mongodb
#
# postgres: dumps the control plane and every tenant database (one restorable file
#           per tenant). Runs in the postgres image (pg_dump, psql).
# mongodb:  dumps every database into one gzip archive. Runs in the mongo image.
#
# Repeats every BACKUP_INTERVAL_SECONDS and deletes runs older than BACKUP_RETENTION_DAYS.
set -u

ENGINE="${1:?usage: backup.sh postgres|mongodb}"
: "${BACKUP_DIR:=/backups}"
: "${BACKUP_INTERVAL_SECONDS:=86400}"
: "${BACKUP_RETENTION_DAYS:=7}"

backup_postgres() {
  export PGHOST=tenant-postgres PGUSER=postgres PGPASSWORD="$TENANT_POSTGRES_PASSWORD"
  mkdir -p "$1/postgres" || return 1
  pg_dump --format=custom --schema=nicerbase --file="$1/postgres/control-plane.dump" postgres || return 1
  dbs=$(psql -Atc "select datname from pg_database where datname like 'nb\_%'" postgres) || return 1
  for db in $dbs; do
    pg_dump --format=custom --file="$1/postgres/$db.dump" "$db" || return 1
  done
}

backup_mongodb() {
  mkdir -p "$1" || return 1
  mongodump --quiet --gzip --archive="$1/mongodb.archive.gz" \
    --uri="mongodb://$TENANT_MONGODB_USER:$TENANT_MONGODB_PASSWORD@tenant-mongodb:27017/?authSource=admin"
}

while true; do
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  target="$BACKUP_DIR/$ENGINE/$stamp"
  echo "[backup:$ENGINE] $stamp starting"
  if "backup_$ENGINE" "$target"; then
    echo "[backup:$ENGINE] $stamp done ($(du -sh "$target" | cut -f1))"
    find "$BACKUP_DIR/$ENGINE" -mindepth 1 -maxdepth 1 -type d -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -rf {} +
  else
    echo "[backup:$ENGINE] $stamp FAILED; keeping previous backups, retrying next interval" >&2
    rm -rf "$target"
  fi
  sleep "$BACKUP_INTERVAL_SECONDS"
done
