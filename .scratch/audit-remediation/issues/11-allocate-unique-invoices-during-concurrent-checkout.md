# 11: Allocate unique invoices during concurrent checkout

**What to build:** Two valid simultaneous checkouts both complete with distinct invoice numbers, including the first sales of a new day.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 12.

- [ ] Serialize daily sequence allocation on a stable existing database row or an equally small shared mechanism that exists before the first sale.
- [ ] Preserve the existing invoice-number format and database uniqueness constraint.
- [ ] Both simultaneous first-of-day checkouts succeed and receive different invoice numbers.
- [ ] Stock deduction and sale/item/movement creation remain atomic; failed checkout does not leave a partial sale.
- [ ] A PostgreSQL concurrency check covers first-of-day allocation and later overlapping sales.
