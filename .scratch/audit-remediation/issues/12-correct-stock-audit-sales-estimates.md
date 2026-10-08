# 12: Correct stock-audit sales estimates

**What to build:** Physical stock audits include recorded POS sales in the first period and distinguish recorded damage or expiry from inferred sales.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 13.

- [ ] A newly created catalog product at stock 10, followed by a POS sale of three and a physical count of seven, reports three units sold in its first audit.
- [ ] Reconstruct the initial baseline using the relevant recorded movements rather than only current stock and restocks.
- [ ] Exclude known nonsale stock losses from inferred sold units in subsequent audit periods.
- [ ] Unrecorded shelf sales, restocks, partial audit history, and reconciliation movements have explicit, tested treatment without double counting.
- [ ] The live count-sheet estimates and saved audit report use the same rules.
- [ ] Tests cover first-period POS sales, a prior audit plus damage/expiry, restocks, and an ordinary physical-count reconciliation.
