# Receipt Scan Product Matching and Restock Workflow

Supplier receipt scanning stages extracted line items into a temporary queue where items are auto-matched against existing catalog products by name similarity, allowing merchants to link or unlink existing products. On batch import, matched products are restocked by incrementing stock quantity (`existing_qty + scanned_qty`) by default—with a per-item replace override—updating the wholesale cost price while preserving shelf selling prices, backfilling empty barcodes, and recording an audit record in `stock_movements`.
