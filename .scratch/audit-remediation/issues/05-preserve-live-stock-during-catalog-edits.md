# 05: Preserve live stock during catalog edits

**What to build:** Editing a catalog product's descriptive fields preserves stock changes made by sales or restocks while the edit form was open.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Source audit findings:** 6.

- [x] Saving a name, price, unit, barcode, or category change without changing the stock field does not overwrite current stock.
- [x] If a user intentionally changes stock but it changed after the form opened, reject the stale save with a clear recovery message rather than overwriting it.
- [x] Existing validation, catalog editing, and deliberate stock correction remain available.
- [x] A check opens a product at stock 10, records a sale of two units, then saves a name edit and verifies that stock remains eight.
- [x] Tests also cover an unchanged stock field and a conflicting deliberate stock correction.

## Implementation

Catalog edits submit `original_stock_quantity` captured when the form opened. The API locks and reloads the product, skips unchanged stock, and rejects conflicting corrections with instructions to refresh and reopen. Updates containing `stock_quantity` require the original quantity; metadata-only updates remain supported.

Verified by `CatalogStockEditTest` (four tests), the full backend suite (57 tests), frontend TypeScript checks, and ESLint on the changed frontend files.

Standards and spec reviews found no blocking issues. Conflict detection compares quantities: intervening movements that restore the opening quantity do not reject a correction. Tracking every intervening change would require a stock revision token.
