# 08: Make merge restore a repeatable catalog sync

**What to build:** Merge mode updates or adds catalog products and categories while leaving existing sales, customer debts, stock audits, and stock movements untouched.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 9.

- [ ] Merge mode does not append sale items, audit items, or stock movements from a full backup.
- [ ] Running the same catalog sync twice does not multiply products with a stable matching identity or any transaction records; define the behavior for products without a matching barcode.
- [ ] Existing sales, payment statuses, audit headers/items, and movement counts remain unchanged after merge.
- [ ] Full restore continues restoring supported transaction history.
- [ ] The restore preview and result clearly describe catalog-sync behavior and report accurate counts.
- [ ] Tests merge the same full backup twice into a populated store and verify that transaction rows and header totals remain unchanged.
