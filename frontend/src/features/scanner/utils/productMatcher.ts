import { Product } from "@/features/products/types/product.types";
import { ScannedItem } from "@/features/scanner/types/scanner.types";

/**
 * Normalizes text for comparison: lowercased, stripped punctuation, normalized whitespace.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes Dice-Sørensen token similarity between two strings.
 * Gives extra weight to shared consecutive tokens or substring inclusion.
 */
export function computeSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1;

  // If one is fully contained in the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    const ratio = minLen / maxLen;
    // Substring inclusion yields between 0.75 and 0.95
    return Math.max(0.75, 0.75 + ratio * 0.2);
  }

  const tokens1 = norm1.split(" ").filter((t) => t.length > 1);
  const tokens2 = norm2.split(" ").filter((t) => t.length > 1);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set2 = new Set(tokens2);
  let intersectionCount = 0;

  for (const t of tokens1) {
    if (set2.has(t)) {
      intersectionCount++;
    } else {
      // Partial token match (e.g. prefix match like "dowee" vs "dowee-white")
      for (const t2 of tokens2) {
        if ((t.length >= 4 && t2.startsWith(t)) || (t2.length >= 4 && t.startsWith(t2))) {
          intersectionCount += 0.8;
          break;
        }
      }
    }
  }

  const dice = (2 * intersectionCount) / (tokens1.length + tokens2.length);
  return Math.min(1, dice);
}

export interface MatchResult {
  matchedProduct: Product | null;
  suggestedProduct: Product | null;
  confidence: "exact" | "high" | "suggested" | null;
  score: number;
}

/**
 * Finds the best catalog product matching a scanned line item.
 */
export function findBestProductMatch(
  scanned: Pick<ScannedItem, "name" | "original_name" | "barcode">,
  catalogProducts: Product[]
): MatchResult {
  if (!catalogProducts || catalogProducts.length === 0) {
    return { matchedProduct: null, suggestedProduct: null, confidence: null, score: 0 };
  }

  // 1. Direct barcode match
  if (scanned.barcode && scanned.barcode.trim()) {
    const cleanBarcode = scanned.barcode.trim();
    const barcodeMatch = catalogProducts.find(
      (p) => p.barcode && p.barcode.trim() === cleanBarcode
    );
    if (barcodeMatch) {
      return {
        matchedProduct: barcodeMatch,
        suggestedProduct: null,
        confidence: "exact",
        score: 1.0,
      };
    }
  }

  // 2. Name similarity matching
  let bestProduct: Product | null = null;
  let bestScore = 0;

  const scannedNames = [scanned.name, scanned.original_name].filter(Boolean) as string[];

  for (const product of catalogProducts) {
    const catalogNames = [product.name, product.original_name].filter(Boolean) as string[];

    for (const sName of scannedNames) {
      for (const cName of catalogNames) {
        const score = computeSimilarity(sName, cName);
        if (score > bestScore) {
          bestScore = score;
          bestProduct = product;
        }
      }
    }
  }

  if (bestScore >= 0.98) {
    return {
      matchedProduct: bestProduct,
      suggestedProduct: null,
      confidence: "exact",
      score: bestScore,
    };
  }

  if (bestScore >= 0.75) {
    return {
      matchedProduct: bestProduct,
      suggestedProduct: null,
      confidence: "high",
      score: bestScore,
    };
  }

  if (bestScore >= 0.50) {
    return {
      matchedProduct: null,
      suggestedProduct: bestProduct,
      confidence: "suggested",
      score: bestScore,
    };
  }

  return {
    matchedProduct: null,
    suggestedProduct: null,
    confidence: null,
    score: bestScore,
  };
}

/**
 * Links a scanned queue item to an existing catalog product.
 * Preserves the catalog product's selling price per domain guidelines.
 */
export function linkScannedItemToProduct(
  item: ScannedItem,
  product: Product,
  mode: "add" | "replace" = "add"
): ScannedItem {
  return {
    ...item,
    matched_product_id: product.id,
    matched_product_name: product.name,
    current_stock: product.stock_quantity,
    catalog_unit: product.unit,
    catalog_selling_price: product.selling_price,
    // Preserve existing product's shelf selling price
    selling_price: product.selling_price || item.selling_price,
    update_mode: mode,
    match_confidence: "high",
    suggested_product_id: null,
    suggested_product_name: null,
  };
}

/**
 * Unlinks a scanned item, returning it to New Product status.
 */
export function unlinkScannedItem(item: ScannedItem): ScannedItem {
  const next = { ...item };
  delete next.matched_product_id;
  delete next.matched_product_name;
  delete next.current_stock;
  delete next.catalog_unit;
  delete next.catalog_selling_price;
  delete next.update_mode;
  delete next.match_confidence;
  delete next.suggested_product_id;
  delete next.suggested_product_name;
  return next;
}

/**
 * Converts pack quantities to piece quantities for a scanned item.
 */
export function convertScannedItemPackToPieces(
  item: ScannedItem,
  piecesPerPack: number
): ScannedItem {
  if (piecesPerPack <= 0) return item;

  const packCost = parseFloat(item.cost_price) || 0;
  const unitCost = packCost / piecesPerPack;
  const newQty = (item.stock_quantity || 1) * piecesPerPack;

  return {
    ...item,
    unit: item.catalog_unit || "pc",
    cost_price: unitCost.toFixed(2),
    stock_quantity: newQty,
  };
}

/**
 * Automatically processes an array of scanned items against active catalog products.
 */
export function autoMatchScannedItems(
  items: ScannedItem[],
  catalogProducts: Product[]
): ScannedItem[] {
  return items.map((item) => {
    // If already manually matched, leave as-is
    if (item.matched_product_id) {
      const prod = catalogProducts.find((p) => p.id === item.matched_product_id);
      if (prod) {
        return {
          ...item,
          current_stock: prod.stock_quantity,
          catalog_unit: prod.unit,
          catalog_selling_price: prod.selling_price,
        };
      }
      return item;
    }

    const { matchedProduct, suggestedProduct, confidence } = findBestProductMatch(
      item,
      catalogProducts
    );

    if (matchedProduct && (confidence === "exact" || confidence === "high")) {
      return linkScannedItemToProduct(item, matchedProduct, item.update_mode || "add");
    }

    if (suggestedProduct) {
      return {
        ...item,
        suggested_product_id: suggestedProduct.id,
        suggested_product_name: suggestedProduct.name,
        match_confidence: "suggested",
      };
    }

    return item;
  });
}
