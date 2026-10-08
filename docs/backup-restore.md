# Sari-IMS: Backup & Restore Guide

This document covers operational backup strategies, atomic snapshot creation, and disaster recovery restoration procedures for Sari-IMS.

---

## 1. Creating a Database Backup

Sari-IMS provides an atomic backup utility using `pg_dump` compressed with gzip:

```bash
cd deploy
./backup.sh
```

Backups are saved to `deploy/backups/` with timestamps:
```text
deploy/backups/sari_backup_YYYYMMDD_HHMMSS.sql.gz
```

### What is Included in the Backup:
* Complete PostgreSQL database schema.
* Store business records (products, categories, sales, stock movement audit trails).
* Onboarding and installation state machine (`installations`, `stores`, `settings`).
* Encrypted integration credentials (`integration_credentials`).

---

## 2. Restoring from a Backup

To restore a database snapshot into the active PostgreSQL container:

```bash
# Set your backup target
BACKUP_FILE="backups/sari_backup_20260910_120000.sql.gz"

# Decompress and stream into psql
gunzip -c "${BACKUP_FILE}" | docker exec -i sari_postgres_prod psql -U sari_prod_user -d sari_inventory
```

*(If running in local development mode, replace `sari_postgres_prod` with `sari_postgres` and `sari_prod_user` with `sari_user`)*.

---

## 3. Disaster Recovery & Machine Migration

To migrate Sari-IMS to a completely new server:

1. **Copy Runtime Files**:
   * Transfer `deploy/.env` (contains your `APP_KEY` and database credentials).
   * Transfer the latest `sari_backup_*.sql.gz` file.
2. **Launch on New Host**:
   ```bash
   git clone https://github.com/louienismal4/sari-ims.git
   cd sari-ims/deploy
   cp /path/to/transferred/.env .env
   ./install.sh
   ```
3. **Restore Database Snapshot**:
   ```bash
   gunzip -c /path/to/sari_backup.sql.gz | docker exec -i sari_postgres_prod psql -U sari_prod_user -d sari_inventory
   ```
4. **Validate System Health**:
   ```bash
   curl -s http://localhost/health/ready
   ```

> [!IMPORTANT]
> The `APP_KEY` in `deploy/.env` MUST match the original server. If the `APP_KEY` is lost or changed, encrypted secrets in `integration_credentials` cannot be decrypted.

## 4. JSON Instance Restore

The settings restore API accepts full JSON backups with `format: sari_full_instance_backup`,
`version: "1.0"`, and all five list sections: `categories`, `products`, `sales`,
`stock_movements`, and `stock_audits`. Records and references are validated before
any current data is changed. Unsupported or invalid input returns HTTP 422.

A full backup with all five sections explicitly empty is valid and clears current
store records in full restore mode. An empty legacy product array is rejected;
nonempty legacy product arrays with valid names, prices, and stock quantities are
still supported, including nested `category.name` or `category_name`. Summary
counts are informational and are not used to decide what to restore.

Full restores delete and rebuild store records in one transaction with foreign
keys enabled. A failure during restore rolls back both deletes and inserts.
