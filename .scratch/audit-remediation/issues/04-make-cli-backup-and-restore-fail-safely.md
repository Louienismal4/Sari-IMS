# 04: Make CLI backup and restore fail safely

**What to build:** Operators can create a verified SQL backup and restore it over an existing production database without silent errors or mixed old/new records.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 4, 5.

- [x] Failure of the database dump, compression, decompression, or SQL restore returns failure instead of printing success.
- [x] Only a completed successful dump is published as the final backup archive; a compressed empty stream cannot pass as a successful dump.
- [x] Update and reset stop when their required safety backup fails, while retaining any deliberately requested existing backup opt-out.
- [x] Restoring a backup replaces the intended database contents, stops on SQL errors, and rolls back failed restoration; application writes cannot interfere.
- [x] Both supported CLI entry points behave consistently.
- [x] An isolated PostgreSQL check restores over an existing populated database and compares the result with the original snapshot; failure checks cover dump failure, corrupted archive, and SQL failure.

## Implementation

Both production CLI entry points publish only nonempty, verified SQL archives from
private temporary files. Update and reset abort on safety-backup failures; reset's
explicit `--no-backup` option remains available.

Restore fully decompresses before touching data, stops a running backend, replaces
its public schema in one PostgreSQL transaction, and rolls back SQL errors. A
one-use entrypoint marker prevents migrations/seeds on restore restart; unsupported
older backend images are rejected before stopping the backend or changing data.

Validation: nine isolated PostgreSQL 17 CLI tests pass for both entrypoints,
including full snapshot comparison, legacy dumps, rollback, dump/compression/archive
failures, backup opt-out, and bootstrap behavior. Shell syntax, frontend typecheck,
and the full backend suite pass (65 passed, two skipped). Standards/spec review
completed; the identified backend compatibility issue is fixed and re-reviewed.
