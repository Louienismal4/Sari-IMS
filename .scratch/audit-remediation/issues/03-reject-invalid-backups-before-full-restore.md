# 03: Reject invalid backups before full restore

**What to build:** Full instance restore accepts a supported, validated backup and refuses unrelated, malformed, or internally inconsistent data without changing current store records.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 3.

- [x] Validate the supported backup format/version and required sections, each record's essential fields, and references before clearing any tables.
- [x] An unrelated JSON object is rejected with a clear validation error and leaves categories, catalog products, sales, stock movements, and stock audits unchanged.
- [x] Supported legacy product backups still restore correctly; deliberately empty valid backups have an explicit supported policy.
- [x] A failure while restoring valid input rolls back the database changes.
- [x] Tests cover unrelated input, malformed records, broken references, a valid full backup, a supported legacy backup, and rollback.

## Implementation

BackupService validates format/version, required list sections, record fields,
unique identities, and catalog references before restoring. Full restore uses
transactional child-first deletes with foreign keys enabled. Invalid input
returns 422 with field errors. Empty full backups are explicitly supported; empty
legacy arrays are rejected. Coverage is in `backend/tests/Feature/BackupApiTest.php`.
