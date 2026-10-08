# 13: Require review of ambiguous receipt product matches

**What to build:** A scanned item cannot silently restock a different flavor or a catalog product with a conflicting barcode.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 14.

- [ ] Different nonempty barcodes never produce an automatic catalog match.
- [ ] Fuzzy name matches become suggestions that require merchant confirmation before they change catalog stock.
- [ ] Exact unambiguous matches remain convenient, and merchants can still manually link or unlink scanned items.
- [ ] Kalamansi and Chilimansi receipt items with different barcodes are not automatically linked.
- [ ] Import preserves the confirmed catalog product's shelf selling price and other protected catalog attributes as required by the existing receipt-restock decision.
- [ ] Small matcher tests cover conflicting barcodes, similar flavors, exact matching, ambiguous matching, and explicit confirmation.
