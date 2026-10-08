# Backend checks

Run the default SQLite suite from `backend/`:

```sh
php artisan test
```

The backup snapshot concurrency check requires PostgreSQL and two independent
connections. Supply credentials for a disposable test database:

```sh
DB_CONNECTION=pgsql DB_HOST=127.0.0.1 DB_PORT=5432 \
DB_DATABASE=sari_backup_07_test DB_USERNAME=sari_user DB_PASSWORD='<test password>' DB_URL= \
php artisan test --filter=BackupSnapshotTest
```

Create the database first. These tests rebuild and roll back its schema; the
database name must end in `_test`. The default SQLite run skips the two
PostgreSQL-specific checks.

The concurrency check commits a checkout on a second connection between export
reads, verifies all backup sections retain the earlier snapshot, then verifies a
subsequent export sees the committed changes. The other checks cover browser
settings, transaction cleanup after success and failure, and rejection of export
inside an existing PostgreSQL transaction.
