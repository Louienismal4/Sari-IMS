# Sari-IMS

Inventory management and point-of-sale system tailored for Philippine sari-sari stores.

## Language

### Inventory & Catalog

**Catalog Product**:
A tracked product in the store's inventory database with a defined unit, stock quantity, cost price, and selling price.
_Avoid_: Stock item, main stock, SKU item

**Scanned Item**:
A line item extracted from a supplier receipt via OCR, currently staged in the staging queue prior to ledger import.
_Avoid_: Extracted item, receipt row

**Restock**:
An inventory stock-in event that increments an existing catalog product's stock quantity and records a stock movement in the ledger.
_Avoid_: Stock replenishment, reload, add stock

**Staging Queue**:
The temporary review table holding scanned receipt items, allowing merchants to edit, match, or discard items before committing them to inventory.
_Avoid_: Scan queue, draft list

**Product Matching**:
The association of a scanned item with an existing catalog product by product ID to restock it rather than creating a duplicate product.
_Avoid_: Linking, picking stock, SKU mapping

**Pack Conversion**:
The transformation of a wholesale purchase unit (e.g. pack, box) into individual retail units (e.g. pc, sachet), dividing unit cost and multiplying stock quantity by pieces per pack.
_Avoid_: Unit breakdown, unbundling, de-boxing

