"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Layers,
  Search,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { parseCsv } from "@/lib/csvParser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/features/products/types/product.types";
import { Category, UnitOfMeasure } from "@/features/settings/types/settings.types";
import { batchStoreProducts } from "@/features/products/api/productService";
import { downloadSampleInventoryCsv } from "@/lib/templateGenerator";

export interface ParsedImportRow {
  id: string;
  name: string;
  original_name?: string;
  barcode: string | null;
  category_name: string;
  unit: string;
  cost_price: number | null;
  selling_price: number | null;
  stock_quantity: number | null;
  reorder_level: number;
  errors: string[];
  warnings: string[];
  isExistingBarcode: boolean;
  existingProductName?: string;
  currentStock?: number;
}

interface ExcelImportCardProps {
  categories: Category[];
  existingProducts: Product[];
  allUnits: UnitOfMeasure[];
  onRefreshInventory: () => Promise<void>;
  onAddCategory: (name: string) => Promise<Category>;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

const ROWS_PER_PAGE = 20;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

type CellValue = string | number | boolean | Date | null | undefined;

// Helper to strip BOM and trim strings
function sanitizeCellString(val: CellValue | unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val).replace(/^\uFEFF/, "").trim();
  return str;
}

// Helper to parse currency values handling ₱, PHP, $, commas, and float integers
function parseCurrency(val: CellValue | unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  let str = String(val).replace(/^\uFEFF/, "").trim();
  if (!str) return null;
  // Remove currency signs (₱, $, €, £), currency codes (PHP, Php, php), and commas
  str = str
    .replace(/^[₱$€£]/, "")
    .replace(/\b(PHP|Php|php)\b/gi, "")
    .replace(/,/g, "")
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// Helper to parse integer values (handling float strings like "10.0" or "10.00")
function parseInteger(val: CellValue | unknown, defaultValue = 0): number | null {
  const num = parseCurrency(val);
  if (num === null) return defaultValue;
  return Math.round(num);
}

// Barcode sanitizer (removes hidden control characters, trims)
function sanitizeBarcode(val: CellValue | unknown): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val)
    .replace(/^\uFEFF/, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
  return str.length > 0 ? str : null;
}

export interface WorkbookSheet {
  sheet: string;
  data: unknown[][];
}

export function ExcelImportCard({
  categories,
  existingProducts,
  allUnits,
  onRefreshInventory,
  onAddCategory,
  showToast,
}: ExcelImportCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<WorkbookSheet[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Import options
  const [updateMode, setUpdateMode] = useState<"replace" | "add">("replace");
  const [autoCreateCategories, setAutoCreateCategories] = useState(true);
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);

  // Table filtering & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "valid" | "issues" | "existing">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Map of existing barcodes for fast O(1) collision detection
  const existingBarcodeMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of existingProducts) {
      if (p.barcode) {
        map.set(p.barcode.trim().toLowerCase(), p);
      }
    }
    return map;
  }, [existingProducts]);

  // Transform raw 2D array into validated ParsedImportRow[]
  const processRawRows = useCallback(
    (rawRows: unknown[][]): ParsedImportRow[] => {
      if (!rawRows || rawRows.length < 2) {
        return [];
      }

      // 1. Identify headers from Row 0
      const headerRow = rawRows[0];
      let nameIdx = -1;
      let barcodeIdx = -1;
      let categoryIdx = -1;
      let unitIdx = -1;
      let costIdx = -1;
      let priceIdx = -1;
      let stockIdx = -1;
      let reorderIdx = -1;
      let origNameIdx = -1;

      headerRow.forEach((col, idx) => {
        const raw = sanitizeCellString(col).toLowerCase();
        // Remove special chars for clean matching
        const clean = raw.replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();

        if (nameIdx === -1 && /^(product\s*name|item\s*name|product|item|name|description|paninda|pangalan)$/.test(clean)) {
          nameIdx = idx;
        } else if (barcodeIdx === -1 && /^(barcode\s*sku|barcode|sku|upc|ean|code|kodigo)$/.test(clean)) {
          barcodeIdx = idx;
        } else if (categoryIdx === -1 && /^(category\s*name|category|kategorya)$/.test(clean)) {
          categoryIdx = idx;
        } else if (unitIdx === -1 && /^(unit\s*of\s*measure|unit|uom|packaging|measure|sukat)$/.test(clean)) {
          unitIdx = idx;
        } else if (costIdx === -1 && /^(cost\s*price\s*php|cost\s*price|cost\s*php|cost|puhunan|buying\s*price|capital)$/.test(clean)) {
          costIdx = idx;
        } else if (priceIdx === -1 && /^(selling\s*price\s*php|selling\s*price|price\s*php|price|retail\s*price|benta|presyo)$/.test(clean)) {
          priceIdx = idx;
        } else if (stockIdx === -1 && /^(stock\s*quantity|stock\s*qty|stock|quantity|qty|count|bilang|dami)$/.test(clean)) {
          stockIdx = idx;
        } else if (reorderIdx === -1 && /^(reorder\s*level|min\s*stock|minimum\s*stock|reorder|alert\s*level)$/.test(clean)) {
          reorderIdx = idx;
        } else if (origNameIdx === -1 && /^(original\s*name|receipt\s*name|original\s*receipt\s*name)$/.test(clean)) {
          origNameIdx = idx;
        }
      });

      // Default to index positions if headers weren't named (e.g. Standard template layout)
      if (nameIdx === -1 && headerRow.length > 0) nameIdx = 0;
      if (barcodeIdx === -1 && headerRow.length > 1) barcodeIdx = 1;
      if (categoryIdx === -1 && headerRow.length > 2) categoryIdx = 2;
      if (unitIdx === -1 && headerRow.length > 3) unitIdx = 3;
      if (costIdx === -1 && headerRow.length > 4) costIdx = 4;
      if (priceIdx === -1 && headerRow.length > 5) priceIdx = 5;
      if (stockIdx === -1 && headerRow.length > 6) stockIdx = 6;
      if (reorderIdx === -1 && headerRow.length > 7) reorderIdx = 7;
      if (origNameIdx === -1 && headerRow.length > 8) origNameIdx = 8;

      // 2. Count barcode occurrences within this sheet to catch internal duplicates
      const fileBarcodeCounts = new Map<string, number>();
      for (let r = 1; r < rawRows.length; r++) {
        const rawRow = rawRows[r];
        if (!rawRow || rawRow.every((c) => c === null || c === undefined || String(c).trim() === "")) {
          continue;
        }
        const b = barcodeIdx >= 0 ? sanitizeBarcode(rawRow[barcodeIdx]) : null;
        if (b) {
          const key = b.toLowerCase();
          fileBarcodeCounts.set(key, (fileBarcodeCounts.get(key) || 0) + 1);
        }
      }

      // 3. Process each data row
      const processed: ParsedImportRow[] = [];

      for (let r = 1; r < rawRows.length; r++) {
        const rawRow = rawRows[r];
        // Skip completely empty rows
        if (!rawRow || rawRow.every((c) => c === null || c === undefined || String(c).trim() === "")) {
          continue;
        }

        const name = nameIdx >= 0 ? sanitizeCellString(rawRow[nameIdx]) : "";
        const original_name = origNameIdx >= 0 ? sanitizeCellString(rawRow[origNameIdx]) : "";
        const barcode = barcodeIdx >= 0 ? sanitizeBarcode(rawRow[barcodeIdx]) : null;
        const category_name = categoryIdx >= 0 ? sanitizeCellString(rawRow[categoryIdx]) : "";
        
        // Unit resolution with case/whitespace trimming
        const rawUnit = unitIdx >= 0 ? sanitizeCellString(rawRow[unitIdx]) : "";
        const cleanUnit = rawUnit.trim().toLowerCase();
        let matchedUnit = "pc";
        if (cleanUnit) {
          const found = allUnits.find(
            (u) =>
              u.name.toLowerCase() === cleanUnit ||
              u.label.toLowerCase() === cleanUnit ||
              u.id.toLowerCase() === cleanUnit
          );
          matchedUnit = found ? found.name : cleanUnit;
        }

        const cost_price = costIdx >= 0 ? parseCurrency(rawRow[costIdx]) : null;
        const selling_price = priceIdx >= 0 ? parseCurrency(rawRow[priceIdx]) : null;
        const stock_quantity = stockIdx >= 0 ? parseInteger(rawRow[stockIdx], 0) : null;
        const reorder_level = reorderIdx >= 0 ? (parseInteger(rawRow[reorderIdx], 5) ?? 5) : 5;

        // Validation errors and warnings
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!name) {
          errors.push("Product name is required");
        }

        if (cost_price === null || cost_price < 0) {
          errors.push("Cost price must be a valid number ≥ 0");
        }

        if (selling_price === null || selling_price < 0) {
          errors.push("Selling price must be a valid number ≥ 0");
        }

        if (stock_quantity === null || stock_quantity < 0) {
          errors.push("Stock quantity must be a non-negative integer");
        }

        // Duplicate barcode in file check
        if (barcode && (fileBarcodeCounts.get(barcode.toLowerCase()) || 0) > 1) {
          warnings.push("Barcode appears multiple times in file");
        }

        // Selling below cost warning
        if (cost_price !== null && selling_price !== null && selling_price < cost_price) {
          warnings.push(`Selling price (₱${selling_price.toFixed(2)}) is lower than cost (₱${cost_price.toFixed(2)})`);
        }

        // Existing product in database check
        let isExistingBarcode = false;
        let existingProductName: string | undefined;
        let currentStock: number | undefined;

        if (barcode) {
          const existing = existingBarcodeMap.get(barcode.toLowerCase());
          if (existing) {
            isExistingBarcode = true;
            existingProductName = existing.name;
            currentStock = existing.stock_quantity;
          }
        }

        processed.push({
          id: `row-${r}`,
          name,
          original_name: original_name || undefined,
          barcode,
          category_name,
          unit: matchedUnit,
          cost_price,
          selling_price,
          stock_quantity,
          reorder_level,
          errors,
          warnings,
          isExistingBarcode,
          existingProductName,
          currentStock,
        });
      }

      return processed;
    },
    [allUnits, existingBarcodeMap]
  );

  // File parsing handler for CSV and Excel (.xlsx, .xls)
  const handleFileSelect = async (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      showToast("File exceeds 10MB limit. Please upload a smaller file.", "error");
      return;
    }

    setIsLoading(true);
    setFile(selectedFile);
    setCurrentPage(1);

    try {
      const fileName = selectedFile.name.toLowerCase();

      if (fileName.endsWith(".csv")) {
        // Read CSV via zero-dependency RFC 4180 parser with UTF-8 BOM handling
        const text = await selectedFile.text();
        const rows = parseCsv(text);
        setSheets([{ sheet: "Sheet1", data: rows }]);
        setSelectedSheetIndex(0);
        const processed = processRawRows(rows);
        setParsedRows(processed);
        setIsLoading(false);
        if (processed.length === 0) {
          showToast("No product rows found in CSV file.", "warning");
        } else {
          showToast(`Parsed ${processed.length} rows from CSV!`, "success");
        }
      } else {
        // Dynamically import read-excel-file/browser on demand
        const { default: readXlsxFile } = await import("read-excel-file/browser");
        const parsedSheets = await readXlsxFile(selectedFile);
        if (!parsedSheets || parsedSheets.length === 0) {
          throw new Error("No sheets found in Excel workbook.");
        }

        const workbookSheets: WorkbookSheet[] = parsedSheets.map((s) => ({
          sheet: s.sheet,
          data: s.data as unknown[][],
        }));

        setSheets(workbookSheets);
        setSelectedSheetIndex(0);

        const firstSheetRows = workbookSheets[0].data;
        const processed = processRawRows(firstSheetRows);
        setParsedRows(processed);
        setIsLoading(false);

        if (parsedSheets.length > 1) {
          showToast(
            `Parsed ${processed.length} rows from Sheet "${parsedSheets[0].sheet}" (${parsedSheets.length} sheets found).`,
            "info"
          );
        } else {
          showToast(`Parsed ${processed.length} rows from Excel!`, "success");
        }
      }
    } catch (err) {
      console.error("File reading error:", err);
      showToast("Failed to read file. Make sure it is a valid .xlsx, .xls, or .csv file.", "error");
      setFile(null);
      setSheets([]);
      setParsedRows([]);
      setIsLoading(false);
    }
  };

  // Switch active Excel sheet
  const handleSelectSheet = (index: number) => {
    if (!sheets[index]) return;
    setSelectedSheetIndex(index);
    setCurrentPage(1);
    const processed = processRawRows(sheets[index].data);
    setParsedRows(processed);
    showToast(`Switched to sheet "${sheets[index].sheet}" (${processed.length} rows).`, "info");
  };

  // Remove single row from preview table
  const handleDeleteRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Reset file selection
  const handleClearFile = () => {
    setFile(null);
    setSheets([]);
    setSelectedSheetIndex(0);
    setParsedRows([]);
    setSearchQuery("");
    setCurrentPage(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Pre-flight metrics
  const validRows = useMemo(() => parsedRows.filter((r) => r.errors.length === 0), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter((r) => r.errors.length > 0), [parsedRows]);
  const existingRows = useMemo(() => parsedRows.filter((r) => r.isExistingBarcode), [parsedRows]);

  // Detected unique categories that do not exist yet in database
  const missingCategories = useMemo(() => {
    const existingNames = new Set(categories.map((c) => c.name.trim().toLowerCase()));
    const missing = new Set<string>();

    for (const r of validRows) {
      const trimmed = r.category_name.trim();
      if (trimmed && !existingNames.has(trimmed.toLowerCase())) {
        missing.add(trimmed);
      }
    }
    return Array.from(missing);
  }, [categories, validRows]);

  // Filtered rows for the preview table
  const filteredRows = useMemo(() => {
    return parsedRows.filter((row) => {
      // Status filter
      if (filterStatus === "valid" && row.errors.length > 0) return false;
      if (filterStatus === "issues" && row.errors.length === 0 && row.warnings.length === 0) return false;
      if (filterStatus === "existing" && !row.isExistingBarcode) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = row.name.toLowerCase().includes(query);
        const matchBarcode = (row.barcode || "").toLowerCase().includes(query);
        const matchCategory = row.category_name.toLowerCase().includes(query);
        return matchName || matchBarcode || matchCategory;
      }

      return true;
    });
  }, [parsedRows, filterStatus, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, currentPage]);

  // Execution of the batch import
  const handleExecuteImport = async () => {
    // Rows to import based on skipInvalidRows setting
    const itemsToImport = skipInvalidRows ? validRows : parsedRows;

    if (itemsToImport.length === 0) {
      showToast("No valid products to import.", "warning");
      return;
    }

    if (!skipInvalidRows && invalidRows.length > 0) {
      showToast(`Cannot proceed: ${invalidRows.length} rows have errors. Please fix/delete them or enable "Skip rows with errors".`, "error");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Auto-create missing categories if enabled
      const categoryIdMap = new Map<string, number>();
      categories.forEach((c) => categoryIdMap.set(c.name.trim().toLowerCase(), c.id));

      if (autoCreateCategories && missingCategories.length > 0) {
        for (const catName of missingCategories) {
          try {
            const created = await onAddCategory(catName);
            categoryIdMap.set(catName.toLowerCase(), created.id);
          } catch (err) {
            console.warn(`Failed to auto-create category "${catName}":`, err);
          }
        }
      }

      // Step 2: Prepare batch payload
      const payload = itemsToImport.map((r) => {
        const cleanCatName = r.category_name.trim().toLowerCase();
        const catId = categoryIdMap.get(cleanCatName) ?? null;

        return {
          name: r.name,
          original_name: r.original_name || r.name,
          barcode: r.barcode,
          category_id: catId,
          unit: r.unit || "pc",
          cost_price: Number(r.cost_price ?? 0).toFixed(2),
          selling_price: Number(r.selling_price ?? 0).toFixed(2),
          stock_quantity: r.stock_quantity ?? 0,
          reorder_level: r.reorder_level ?? 5,
        };
      });

      // Step 3: Send to backend batch endpoint
      const result = await batchStoreProducts(payload, updateMode);

      // Step 4: Refresh inventory data
      await onRefreshInventory();

      const updatedCount = itemsToImport.filter((r) => r.isExistingBarcode).length;
      const newCount = itemsToImport.length - updatedCount;

      showToast(
        `Successfully imported ${result.length} products! (${newCount} new, ${updatedCount} updated stock)`,
        "success"
      );

      // Reset importer state
      handleClearFile();
    } catch (err: unknown) {
      console.error("Batch import failed:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to import products.";
      showToast(errMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-2xs border-zinc-200">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-zinc-900">
                Excel &amp; CSV Catalog Import
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Bulk import products from spreadsheets with pre-flight validation and collision handling
              </CardDescription>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadSampleInventoryCsv}
            className="text-xs text-zinc-700 hover:text-zinc-900 border-zinc-200"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
            Download Sample CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Step 1: File Dropzone when no file selected */}
        {!file && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-emerald-600 bg-emerald-50/50"
                : "border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>

            <h4 className="text-sm font-semibold text-zinc-900 mb-1">
              Drag &amp; drop your Excel (.xlsx) or CSV file here
            </h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mb-4">
              Supports UTF-8 BOM, currency symbols (₱, PHP), thousand commas (1,500), and auto-maps
              column headers like Name, Barcode SKU, Category, Unit, Cost Price, Selling Price, and Stock.
            </p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Parsing spreadsheet...
                </>
              ) : (
                "Select File from Computer"
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Loaded File Banner & Multi-Sheet Selector */}
        {file && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/80 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-emerald-800 text-white flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900 truncate max-w-xs sm:max-w-sm">
                      {file.name}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {(file.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {parsedRows.length} total rows parsed &bull; {validRows.length} ready to import
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearFile}
                  className="text-xs text-zinc-600 hover:text-zinc-900"
                >
                  Choose Another File
                </Button>
              </div>
            </div>

            {/* Multi-Tab Excel Workbook Detection */}
            {sheets.length > 1 && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="text-xs font-semibold text-amber-900">
                    Multi-sheet Excel workbook detected ({sheets.length} sheets). Showing sheet:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sheets.map((sheet, index) => (
                    <button
                      key={sheet.sheet || index}
                      type="button"
                      onClick={() => handleSelectSheet(index)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        selectedSheetIndex === index
                          ? "bg-zinc-900 text-white font-semibold"
                          : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      {sheet.sheet} ({sheet.data.length - 1} rows)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Import Options & Barcode Collision Selector */}
            <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-zinc-600" />
                Import Configuration
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Collision Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 block">
                    When a barcode already exists in inventory:
                  </label>
                  <div className="space-y-1.5 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-md border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
                      <input
                        type="radio"
                        name="update_mode"
                        value="replace"
                        checked={updateMode === "replace"}
                        onChange={() => setUpdateMode("replace")}
                        className="text-zinc-900 focus:ring-zinc-900"
                      />
                      <div>
                        <span className="font-semibold text-zinc-900">Replace current stock</span>
                        <span className="text-zinc-500 block text-[11px]">
                          Overwrites existing stock with imported quantity (Stock Audit / Inventory Sync)
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-md border border-zinc-200 hover:bg-zinc-50 cursor-pointer">
                      <input
                        type="radio"
                        name="update_mode"
                        value="add"
                        checked={updateMode === "add"}
                        onChange={() => setUpdateMode("add")}
                        className="text-zinc-900 focus:ring-zinc-900"
                      />
                      <div>
                        <span className="font-semibold text-zinc-900">Add to current stock</span>
                        <span className="text-zinc-500 block text-[11px]">
                          Adds imported quantity onto existing stock (Restock / Delivery batch)
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Additional Settings */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCreateCategories}
                        onChange={(e) => setAutoCreateCategories(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                      />
                      <div>
                        <span className="font-semibold text-zinc-900">
                          Auto-create missing categories
                        </span>
                        <span className="text-zinc-500 block text-[11px]">
                          Automatically adds new categories to your store instead of leaving items uncategorized.
                        </span>
                        {missingCategories.length > 0 && autoCreateCategories && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {missingCategories.map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-[10px]">
                                + &quot;{cat}&quot;
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipInvalidRows}
                        onChange={(e) => setSkipInvalidRows(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                      />
                      <div>
                        <span className="font-semibold text-zinc-900">
                          Skip rows with errors and import valid ones
                        </span>
                        <span className="text-zinc-500 block text-[11px]">
                          {skipInvalidRows
                            ? `Imports all ${validRows.length} valid items, skipping ${invalidRows.length} rows with errors.`
                            : "Requires fixing or removing all error rows before import is enabled."}
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Live Pre-Flight Inspection Table */}
            <div className="space-y-3">
              {/* Filter Pills and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("all");
                      setCurrentPage(1);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                      filterStatus === "all"
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("valid");
                      setCurrentPage(1);
                    }}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                      filterStatus === "valid"
                        ? "bg-emerald-800 text-white"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    Ready ({validRows.length})
                  </button>
                  {invalidRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus("issues");
                        setCurrentPage(1);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                        filterStatus === "issues"
                          ? "bg-rose-700 text-white"
                          : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                      }`}
                    >
                      Has Issues ({invalidRows.length})
                    </button>
                  )}
                  {existingRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus("existing");
                        setCurrentPage(1);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                        filterStatus === "existing"
                          ? "bg-sky-800 text-white"
                          : "bg-sky-50 text-sky-800 hover:bg-sky-100"
                      }`}
                    >
                      Updates Existing ({existingRows.length})
                    </button>
                  )}
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Search name or barcode..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Barcode SKU</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3 text-right">Cost (₱)</th>
                        <th className="py-2.5 px-3 text-right">Price (₱)</th>
                        <th className="py-2.5 px-3 text-right">Stock</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {paginatedRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-zinc-500">
                            No rows match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        paginatedRows.map((row) => {
                          const hasErrors = row.errors.length > 0;
                          const hasWarnings = row.warnings.length > 0;

                          return (
                            <tr
                              key={row.id}
                              className={`hover:bg-zinc-50/75 transition-colors ${
                                hasErrors ? "bg-rose-50/40" : row.isExistingBarcode ? "bg-sky-50/30" : ""
                              }`}
                            >
                              {/* Status Badges */}
                              <td className="py-2 px-3 align-top whitespace-nowrap">
                                {hasErrors ? (
                                  <div className="space-y-1">
                                    <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                      <XCircle className="w-3 h-3" />
                                      Error
                                    </Badge>
                                    <div className="text-[10px] text-rose-700 font-medium">
                                      {row.errors.join(", ")}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-1">
                                    {row.isExistingBarcode ? (
                                      <Badge className="bg-sky-100 text-sky-800 border-transparent flex items-center gap-1 w-fit">
                                        <RefreshCw className="w-3 h-3" />
                                        {updateMode === "replace"
                                          ? `Replace (${row.currentStock} → ${row.stock_quantity})`
                                          : `Add (+${row.stock_quantity})`}
                                      </Badge>
                                    ) : (
                                      <Badge variant="success" className="flex items-center gap-1 w-fit">
                                        <CheckCircle2 className="w-3 h-3" />
                                        New Product
                                      </Badge>
                                    )}

                                    {hasWarnings && (
                                      <div className="text-[10px] text-amber-700 font-medium flex items-center gap-0.5">
                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                        {row.warnings.join("; ")}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Product Name */}
                              <td className="py-2 px-3 align-top">
                                <span className="font-semibold text-zinc-900 block">
                                  {row.name || <span className="text-rose-500 italic">Missing name</span>}
                                </span>
                                {row.original_name && row.original_name !== row.name && (
                                  <span className="text-[10px] text-zinc-400 block truncate max-w-xs">
                                    Receipt: {row.original_name}
                                  </span>
                                )}
                              </td>

                              {/* Barcode SKU */}
                              <td className="py-2 px-3 align-top font-mono text-[11px] text-zinc-600 whitespace-nowrap">
                                {row.barcode || <span className="text-zinc-400 italic">None</span>}
                              </td>

                              {/* Category */}
                              <td className="py-2 px-3 align-top whitespace-nowrap">
                                {row.category_name ? (
                                  <Badge variant="outline" className="text-[10px] font-normal">
                                    {row.category_name}
                                  </Badge>
                                ) : (
                                  <span className="text-zinc-400 italic">Uncategorized</span>
                                )}
                              </td>

                              {/* Unit */}
                              <td className="py-2 px-3 align-top whitespace-nowrap font-mono text-zinc-700">
                                {row.unit}
                              </td>

                              {/* Cost Price */}
                              <td className="py-2 px-3 align-top text-right font-mono">
                                {row.cost_price !== null ? (
                                  `₱${row.cost_price.toFixed(2)}`
                                ) : (
                                  <span className="text-rose-500 font-bold">Invalid</span>
                                )}
                              </td>

                              {/* Selling Price */}
                              <td className="py-2 px-3 align-top text-right font-mono">
                                {row.selling_price !== null ? (
                                  `₱${row.selling_price.toFixed(2)}`
                                ) : (
                                  <span className="text-rose-500 font-bold">Invalid</span>
                                )}
                              </td>

                              {/* Stock Quantity */}
                              <td className="py-2 px-3 align-top text-right font-mono font-semibold text-zinc-900">
                                {row.stock_quantity !== null ? (
                                  row.stock_quantity
                                ) : (
                                  <span className="text-rose-500">Invalid</span>
                                )}
                              </td>

                              {/* Remove row */}
                              <td className="py-2 px-3 align-top text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="text-zinc-400 hover:text-rose-600 p-1 rounded transition-colors"
                                  title="Remove row from import"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination & Summary Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border-t border-zinc-200 bg-zinc-50/60 text-xs text-zinc-500 gap-2">
                  <div>
                    Showing {paginatedRows.length} of {filteredRows.length} rows (Page {currentPage} of{" "}
                    {totalPages})
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="h-7 px-2.5 text-xs"
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="h-7 px-2.5 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Submission Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-200 bg-zinc-50 gap-3">
              <div>
                <span className="text-xs font-bold text-zinc-900 block">
                  Ready to Commit Import?
                </span>
                <span className="text-xs text-zinc-500">
                  {skipInvalidRows
                    ? `${validRows.length} valid products will be processed into inventory.`
                    : `${parsedRows.length} rows must all be valid to proceed.`}
                  {existingRows.length > 0 &&
                    ` (${existingRows.length} will update existing barcodes via ${
                      updateMode === "replace" ? "Replace" : "Add"
                    } mode).`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearFile}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleExecuteImport}
                  disabled={
                    isSubmitting ||
                    (skipInvalidRows ? validRows.length === 0 : invalidRows.length > 0 || parsedRows.length === 0)
                  }
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs px-4"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Importing Products...
                    </>
                  ) : (
                    <>
                      Import {skipInvalidRows ? validRows.length : parsedRows.length} Products
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Error banner when skipInvalidRows is false and errors exist */}
            {!skipInvalidRows && invalidRows.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>
                  <strong>Import Blocked:</strong> {invalidRows.length} rows contain validation errors.
                  Please fix or delete them from the table above, or enable &quot;Skip rows with errors&quot; in
                  the options.
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
