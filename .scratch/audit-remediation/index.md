# Sari-IMS audit remediation tickets

Approved by the user and published to the local Markdown tracker. All 16 tickets have Status: ready-for-agent.

Source: the 18 findings in the preceding ponytail audit. Tickets 02 and 04 each combine two related findings.

Each ticket can start independently. Shared files require coordination, not prerequisite edges.

Evidence limit: application suites, live PostgreSQL scenarios, deployment recovery, and camera hardware were not exercised during the audit. Each ticket must verify its reproduction before implementing a fix.

01. [Protect store operations with administrator sign-in](issues/01-protect-store-operations-with-administrator-sign-in.md) — audit 1; no blockers.
02. [Keep integration credentials and model preferences in the database](issues/02-keep-integration-credentials-and-model-preferences-in-the-database.md) — audit 2, 16; no blockers.
03. [Reject invalid backups before full restore](issues/03-reject-invalid-backups-before-full-restore.md) — audit 3; no blockers.
04. [Make CLI backup and restore fail safely](issues/04-make-cli-backup-and-restore-fail-safely.md) — audit 4, 5; no blockers.
05. [Preserve live stock during catalog edits](issues/05-preserve-live-stock-during-catalog-edits.md) — audit 6; no blockers.
06. [Reject stale stock-audit submissions](issues/06-reject-stale-stock-audit-submissions.md) — audit 7; no blockers.
07. [Export one consistent JSON backup snapshot](issues/07-export-one-consistent-json-backup-snapshot.md) — audit 8; no blockers.
08. [Make merge restore a repeatable catalog sync](issues/08-make-merge-restore-a-repeatable-catalog-sync.md) — audit 9; no blockers.
09. [Preserve original dates during full restore](issues/09-preserve-original-dates-during-full-restore.md) — audit 10; no blockers.
10. [Use centavo arithmetic for cash checkout](issues/10-use-centavo-arithmetic-for-cash-checkout.md) — audit 11; no blockers.
11. [Allocate unique invoices during concurrent checkout](issues/11-allocate-unique-invoices-during-concurrent-checkout.md) — audit 12; no blockers.
12. [Correct stock-audit sales estimates](issues/12-correct-stock-audit-sales-estimates.md) — audit 13; no blockers.
13. [Require review of ambiguous receipt product matches](issues/13-require-review-of-ambiguous-receipt-product-matches.md) — audit 14; no blockers.
14. [Honor the configured production HTTPS domain](issues/14-honor-the-configured-production-https-domain.md) — audit 15; no blockers.
15. [Gate release publishing on automated checks](issues/15-gate-release-publishing-on-automated-checks.md) — audit 17; no blockers.
16. [Delete unused onboarding, context, and CSV dependency code](issues/16-delete-unused-onboarding-context-and-csv-dependency-code.md) — audit 18; no blockers.
