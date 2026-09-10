#!/usr/bin/env bash
# ==============================================================================
# SARI-IMS DATABASE BACKUP SCRIPT
# Phase 26: Atomic PostgreSQL backup using pg_dump
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${DEPLOY_DIR}"

BACKUP_DIR="${DEPLOY_DIR}/backups"
mkdir -p "${BACKUP_DIR}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/sari_backup_${TIMESTAMP}.sql.gz"

echo "=================================================="
echo "  💾 Creating Sari-IMS Database Backup"
echo "=================================================="

# Source runtime .env to retrieve credentials
if [ -f ".env" ]; then
    set -a
    . .env
    set +a
else
    echo "❌ Error: .env file not found."
    exit 1
fi

CONTAINER_NAME="sari_postgres_prod"
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    CONTAINER_NAME="sari_postgres"
fi

if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    echo "❌ Error: PostgreSQL container is not running."
    exit 1
fi

echo "Running pg_dump on ${CONTAINER_NAME}..."
docker exec -e PGPASSWORD="${DB_PASSWORD}" "${CONTAINER_NAME}" \
    pg_dump -U "${DB_USERNAME:-sari_user}" -d "${DB_DATABASE:-sari_inventory}" -F p \
    | gzip > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo "✓ Backup created successfully!"
echo "  File: ${BACKUP_FILE} (${FILESIZE})"
echo ""
echo "To restore this backup:"
echo "  gunzip -c ${BACKUP_FILE} | docker exec -i ${CONTAINER_NAME} psql -U ${DB_USERNAME:-sari_user} -d ${DB_DATABASE:-sari_inventory}"
echo "=================================================="
