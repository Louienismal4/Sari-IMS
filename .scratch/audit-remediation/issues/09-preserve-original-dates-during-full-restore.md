# 09: Preserve original dates during full restore

**What to build:** Restored store history retains its original dates instead of making old sales and debts appear newly created.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 10.

- [ ] Restore the original exported creation timestamps for sales, catalog products, and categories through explicit timestamp assignment.
- [ ] Retain existing settlement, audit-period, and movement timestamps, including their correct time-zone meaning.
- [ ] Supported legacy records without timestamps follow a documented fallback rather than failing.
- [ ] An export/restore round-trip check compares original dates with restored dates for representative historical records.
- [ ] Restored sales/debts remain displayed in the expected historical order.
