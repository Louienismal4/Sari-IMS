# 07: Export one consistent JSON backup snapshot

**What to build:** A JSON full instance backup represents one consistent point in time across catalog products, sales, stock movements, and stock audits.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 8.

- [x] All exported database sections come from the same consistent read snapshot on production PostgreSQL.
- [x] A sale committing during export cannot appear in the backup alongside product stock from before that sale's deduction.
- [x] The existing backup format and supplied browser store settings remain supported.
- [x] A PostgreSQL check deliberately interleaves export and checkout and verifies that all exported sections agree.
- [x] The snapshot is scoped to export and does not leave a transaction open after success or failure.

## Implementation

Export runs all database reads and relationship loads in one transaction. On
PostgreSQL it selects REPEATABLE READ and READ ONLY before the first read, and
rejects existing outer transactions to keep isolation scoped to export. The JSON
format and supplied browser settings are unchanged.

`backend/tests/Feature/BackupSnapshotTest.php` deliberately commits checkout on
an independent PostgreSQL connection between export reads, checks catalog,
sales/items, movements, audits/items, and verifies the next export sees the commit.
Success, failure/retry, browser settings, and outer transaction scope are covered.
Run instructions and the disposable database guard are in `backend/tests/README.md`.

Validation: full SQLite backend suite passed (65 passed, two PostgreSQL checks
skipped); all four PostgreSQL snapshot checks passed (35 assertions). Standards
and spec reviews found no issues in this ticket's changes.
