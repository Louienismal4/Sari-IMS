# 06: Reject stale stock-audit submissions

**What to build:** Completing a physical stock count does not undo sales or restocks that happened after the audit sheet state was loaded.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 7.

- [x] The submitted count includes enough original stock state to detect concurrent changes before reconciliation.
- [x] If any counted product changed since the sheet state was loaded, reject the submission atomically and explain that the affected count must be refreshed/recounted.
- [x] A rejected submission creates no completed audit or reconciliation movements and changes no product counts.
- [x] A fresh physical count still reconciles stock and produces its summary report.
- [x] Tests load stock 10, record a two-unit POS sale or a restock, then submit the stale count and verify that the intervening movement is preserved.

## Comments

Implemented: audit submissions carry original stock and a stock revision. Product saves generate a new revision whenever stock changes, including manual corrections that return to the old quantity. The transaction rejects changed products before creating audit or reconciliation records; the frontend sends the sheet state and displays the refresh/recount instruction.

Validation: reproduced stale POS sale and manual stock roundtrip failures before the fixes. Seven audit tests pass. Final backend suite: 65 passed, one skipped, 468 assertions. TypeScript, targeted ESLint, and PHP syntax checks pass. Standards and specification reviews found no remaining issues.

Deployment: run `php artisan migrate` to add stock revisions. Database tests use SQLite; live PostgreSQL concurrency was not exercised. Future bulk SQL stock writers must preserve revisions, as documented in the model.
