"use client";

import { useState, useMemo } from "react";
import {
  Package,
  Check,
  Loader2,
  Search,
  X,
  MoreVertical,
  Edit3,
  Trash2,
  PackageCheck,
  Plus,
  Sparkles,
  Layers,
  Link as LinkIcon,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CardHeader } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Product, ScannedItem } from "@/types/inventory";
import { ProductPickerModal } from "./ProductPickerModal";
import { PackConversionModal } from "./PackConversionModal";

interface ScannedQueueTableProps {
  scannedItems: ScannedItem[];
  tableSearch: string;
  setTableSearch: (val: string) => void;
  batchImporting: boolean;
  catalogProducts: Product[];
  onClearQueue: () => void;
  onBatchImport: () => void;
  onUpdateItemField: (index: number, field: keyof ScannedItem, val: string | number) => void;
  onOpenItemModal: (item: ScannedItem, index: number) => void;
  onDeleteItem: (index: number) => void;
  onLinkProduct: (index: number, product: Product) => void;
  onUnlinkProduct: (index: number) => void;
  onToggleUpdateMode?: (index: number) => void;
  onConvertPack: (index: number, piecesPerPack: number) => void;
  onSwitchToScanners?: () => void;
}

interface MatchStatusBadgeProps {
  item: ScannedItem;
  originalIndex: number;
  catalogProducts: Product[];
  onUnlinkProduct: (index: number) => void;
  onLinkProduct: (index: number, product: Product) => void;
  onOpenPicker: (item: ScannedItem, index: number) => void;
}

function MatchStatusBadge({
  item,
  originalIndex,
  catalogProducts,
  onUnlinkProduct,
  onLinkProduct,
  onOpenPicker,
}: MatchStatusBadgeProps) {
  const isLinked = !!item.matched_product_id;
  const isSuggested = !isLinked && !!item.suggested_product_id;

  if (isLinked) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <Badge
          variant="success"
          className="text-[10px] py-0.5 px-2 gap-1.5 items-center font-medium shadow-2xs shrink-0"
          title={`Matched to catalog: ${item.matched_product_name ?? item.name} (${item.current_stock ?? 0} in stock)`}
        >
          <PackageCheck className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Restock</span>
          <span className="text-emerald-500">·</span>
          <span className="text-emerald-800 font-normal">
            {item.current_stock ?? 0} in stock
          </span>
          <button
            type="button"
            onClick={() => onUnlinkProduct(originalIndex)}
            className="ml-0.5 text-emerald-700/60 hover:text-rose-600 p-0.5 rounded transition-colors"
            title="Unmatch product (mark as new)"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenPicker(item, originalIndex)}
          className="h-5 px-1.5 text-[10px] text-zinc-500 hover:text-zinc-800"
          title="Switch matched catalog product"
        >
          Switch
        </Button>
      </div>
    );
  }

  if (isSuggested) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => {
            const prod = catalogProducts.find((p) => p.id === item.suggested_product_id);
            if (prod) onLinkProduct(originalIndex, prod);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-950 hover:bg-amber-200 transition-colors border border-amber-200"
          title="Click to match with suggested catalog product"
        >
          <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="truncate max-w-[160px]">
            Match: <strong>{item.suggested_product_name}</strong>?
          </span>
          <span className="underline font-bold text-[10px] ml-1">Match</span>
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenPicker(item, originalIndex)}
          className="h-5 px-1.5 text-[10px] text-zinc-500 hover:text-zinc-800"
          title="Search other catalog products"
        >
          Other
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Badge variant="secondary" className="text-[10px] py-0.5 px-1.5 gap-1">
        <Plus className="w-2.5 h-2.5 text-zinc-500" />
        <span>New Product</span>
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onOpenPicker(item, originalIndex)}
        className="h-5 px-1.5 text-[10px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-0.5"
        title="Match to an existing catalog product"
      >
        <LinkIcon className="w-2.5 h-2.5" />
        <span>Match Product</span>
      </Button>
    </div>
  );
}

interface QueueRowDropdownProps {
  item: ScannedItem;
  originalIndex: number;
  isLinked: boolean;
  hasUnitMismatch: boolean;
  onOpenPicker: (item: ScannedItem, index: number) => void;
  onOpenPackModal: (item: ScannedItem, index: number) => void;
  onOpenEditModal: (item: ScannedItem, index: number) => void;
  onDeleteItem: (index: number) => void;
}

function QueueRowDropdown({
  item,
  originalIndex,
  isLinked,
  hasUnitMismatch,
  onOpenPicker,
  onOpenPackModal,
  onOpenEditModal,
  onDeleteItem,
}: QueueRowDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 min-h-[44px] min-w-[44px] text-zinc-400 hover:text-zinc-700"
          aria-label={`Open actions for ${item.name}`}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onOpenPicker(item, originalIndex)}>
          <LinkIcon className="w-3.5 h-3.5 text-zinc-500 mr-2" />
          <span>{isLinked ? "Change Matched Product" : "Match to Catalog Product"}</span>
        </DropdownMenuItem>

        {hasUnitMismatch && (
          <DropdownMenuItem onClick={() => onOpenPackModal(item, originalIndex)}>
            <Layers className="w-3.5 h-3.5 text-amber-600 mr-2" />
            <span>Convert Pack to Pieces</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => onOpenEditModal(item, originalIndex)}>
          <Edit3 className="w-3.5 h-3.5 text-zinc-500 mr-2" />
          <span>Edit Details (Cost, Retail, Qty)</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDeleteItem(originalIndex)}
          className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" />
          <span>Remove</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ScannedQueueTable({
  scannedItems,
  tableSearch,
  setTableSearch,
  batchImporting,
  catalogProducts,
  onClearQueue,
  onBatchImport,
  onUpdateItemField,
  onOpenItemModal,
  onDeleteItem,
  onLinkProduct,
  onUnlinkProduct,
  onConvertPack,
  onSwitchToScanners,
}: ScannedQueueTableProps) {
  // Modal states for picker & pack conversion
  const [pickerTarget, setPickerTarget] = useState<{ item: ScannedItem; index: number } | null>(
    null
  );
  const [packTarget, setPackTarget] = useState<{ item: ScannedItem; index: number } | null>(
    null
  );

  const matchedCount = scannedItems.filter((i) => !!i.matched_product_id).length;
  const newCount = scannedItems.length - matchedCount;

  // Track originalIndex for each item to prevent index corruption during search filtering
  const indexedScannedItems = useMemo(() => {
    return scannedItems
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (!tableSearch.trim()) return true;
        const q = tableSearch.toLowerCase().trim();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.original_name && item.original_name.toLowerCase().includes(q)) ||
          (item.barcode && item.barcode.toLowerCase().includes(q)) ||
          (item.category_name && item.category_name.toLowerCase().includes(q))
        );
      });
  }, [scannedItems, tableSearch]);

  return (
    <>
      {/* Header Strip & Search Filter */}
      <CardHeader className="p-3.5 sm:p-4 border-b border-zinc-200 space-y-3 bg-zinc-50/80 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-zinc-900">
                Staging Queue ({scannedItems.length})
              </h3>
              {scannedItems.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {matchedCount > 0 && (
                    <Badge variant="success" className="text-[10px] py-0 px-1.5">
                      {matchedCount} Restock{matchedCount > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {newCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                      {newCount} New
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Review line items, confirm restock matching, and click &quot;Import All&quot; to commit.
            </p>
          </div>

          {scannedItems.length > 0 && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearQueue}
                className="h-8 text-xs text-zinc-500 hover:text-rose-600"
                title="Clear queue"
              >
                Clear
              </Button>
              <Button
                variant="emerald"
                size="sm"
                disabled={batchImporting}
                onClick={onBatchImport}
                className="gap-1.5 h-8 text-xs"
              >
                {batchImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Import All ({scannedItems.length})</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Search Input for Queue Items */}
        {scannedItems.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <Input
              type="text"
              placeholder="Filter items in queue..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-white"
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch("")}
                className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 p-1"
                aria-label="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </CardHeader>

      {/* Scrollable Table Content */}
      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-100">
        {indexedScannedItems.length === 0 ? (
          <div className="p-10 sm:p-12 text-center text-zinc-400 space-y-2.5 my-auto">
            <Package className="w-8 h-8 mx-auto text-zinc-300" />
            <p className="text-xs font-semibold text-zinc-700">
              {scannedItems.length === 0 ? "Staging queue is empty" : "No matching items in queue"}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {scannedItems.length === 0
                ? "Upload or snap a receipt photo using the scanner to extract items into this queue."
                : "Try a different search keyword."}
            </p>
            {onSwitchToScanners && scannedItems.length === 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onSwitchToScanners}
                className="lg:hidden mt-2 text-xs gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Switch to Scanners</span>
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Full Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="sticky top-0 bg-zinc-50/95 backdrop-blur-xs z-10">
                  <TableRow>
                    <TableHead className="w-[42%]">Product &amp; Match Status</TableHead>
                    <TableHead className="text-right w-[14%]">Cost (₱)</TableHead>
                    <TableHead className="text-right w-[14%]">Retail (₱)</TableHead>
                    <TableHead className="text-center w-[16%]">Qty &amp; Mode</TableHead>
                    <TableHead className="text-right w-[14%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indexedScannedItems.map(({ item, originalIndex }) => {
                    const cost = parseFloat(item.cost_price) || 0;
                    const retail = parseFloat(item.selling_price) || 0;
                    const itemMargin = cost > 0 ? (((retail - cost) / cost) * 100).toFixed(0) : "0";

                    const isLinked = !!item.matched_product_id;
                    const hasUnitMismatch = Boolean(
                      isLinked &&
                      item.catalog_unit &&
                      item.catalog_unit.toLowerCase() !== item.unit.toLowerCase()
                    );

                    const isReplaceMode = item.update_mode === "replace";
                    const totalStockPreview = (item.current_stock ?? 0) + (item.stock_quantity || 0);

                    return (
                      <TableRow key={originalIndex} className="hover:bg-zinc-50/70">
                        {/* Item Name & Matching Status */}
                        <TableCell className="align-top py-3">
                          {/* Match Status Strip */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <MatchStatusBadge
                              item={item}
                              originalIndex={originalIndex}
                              catalogProducts={catalogProducts}
                              onUnlinkProduct={onUnlinkProduct}
                              onLinkProduct={onLinkProduct}
                              onOpenPicker={(targetItem, targetIdx) =>
                                setPickerTarget({ item: targetItem, index: targetIdx })
                              }
                            />

                            {/* Unit Mismatch Badge */}
                            {hasUnitMismatch && (
                              <button
                                type="button"
                                onClick={() => setPackTarget({ item, index: originalIndex })}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors"
                                title="Click to convert pack to pieces"
                              >
                                <Layers className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Unit: {item.unit} vs {item.catalog_unit} (Convert)</span>
                              </button>
                            )}
                          </div>

                          {/* Inline Editable Product Name */}
                          <Input
                            type="text"
                            value={item.name}
                            onChange={(e) => onUpdateItemField(originalIndex, "name", e.target.value)}
                            className="h-8 text-xs font-semibold text-zinc-900 border-zinc-200 focus:border-zinc-900"
                            title="Click to rename item"
                            aria-label={`Rename item ${item.name}`}
                          />

                          <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-1 truncate">
                            <span className="font-semibold text-zinc-500">Receipt text:</span>
                            <span className="truncate" title={item.original_name}>
                              {item.original_name || item.name}
                            </span>
                          </div>
                        </TableCell>

                        {/* Cost (Wholesale from Receipt) */}
                        <TableCell className="text-right align-top py-3 font-mono text-zinc-700 font-medium text-xs">
                          ₱{cost.toFixed(2)}
                          <span className="block text-[10px] text-zinc-400 font-normal">
                            wholesale
                          </span>
                        </TableCell>

                        {/* Retail (Store Shelf Price) */}
                        <TableCell className="text-right align-top py-3">
                          <div className="font-mono font-bold text-zinc-900 text-xs">
                            ₱{retail.toFixed(2)}
                          </div>
                          <span className="text-[11px] text-emerald-600 font-mono block mt-0.5 font-medium">
                            +{itemMargin}% margin
                          </span>
                          {isLinked && (
                            <span className="text-[10px] text-zinc-400 font-mono block">
                              shelf price
                            </span>
                          )}
                        </TableCell>

                        {/* Qty & Mode */}
                        <TableCell className="text-center align-top py-3">
                          <div className="font-mono font-bold text-zinc-900 text-xs">
                            {item.stock_quantity}{" "}
                            <span className="text-[11px] text-zinc-500 font-normal">
                              {item.unit}
                            </span>
                          </div>

                          {isLinked ? (
                            <div className="mt-1 space-y-1">
                              {!isReplaceMode && (
                                <div className="text-[10px] font-mono text-emerald-700 font-medium">
                                  New total: {totalStockPreview}
                                </div>
                              )}

                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                                  isReplaceMode
                                    ? "bg-amber-50 text-amber-900 border-amber-300"
                                    : "bg-emerald-50 text-emerald-900 border-emerald-300"
                                }`}
                                title="Restock Update Mode (editable in modal)"
                              >
                                <span>{isReplaceMode ? "Mode: Replace" : "Mode: Add (+)"}</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400 block font-mono mt-0.5">
                              initial stock
                            </span>
                          )}
                        </TableCell>

                        {/* Row Actions */}
                        <TableCell className="text-right align-top py-3">
                          <QueueRowDropdown
                            item={item}
                            originalIndex={originalIndex}
                            isLinked={isLinked}
                            hasUnitMismatch={hasUnitMismatch}
                            onOpenPicker={(targetItem, targetIdx) =>
                              setPickerTarget({ item: targetItem, index: targetIdx })
                            }
                            onOpenPackModal={(targetItem, targetIdx) =>
                              setPackTarget({ item: targetItem, index: targetIdx })
                            }
                            onOpenEditModal={(targetItem, targetIdx) =>
                              onOpenItemModal(targetItem, targetIdx)
                            }
                            onDeleteItem={onDeleteItem}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Streamlined Item List (Cost, Retail, Qty moved to modal) */}
            <div className="md:hidden divide-y divide-zinc-100">
              {indexedScannedItems.map(({ item, originalIndex }) => {
                const isLinked = !!item.matched_product_id;
                const hasUnitMismatch = Boolean(
                  isLinked &&
                  item.catalog_unit &&
                  item.catalog_unit.toLowerCase() !== item.unit.toLowerCase()
                );
                const retail = parseFloat(item.selling_price) || 0;

                return (
                  <div key={originalIndex} className="p-3.5 hover:bg-zinc-50/70 transition-colors space-y-2.5">
                    {/* Match Status Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <MatchStatusBadge
                        item={item}
                        originalIndex={originalIndex}
                        catalogProducts={catalogProducts}
                        onUnlinkProduct={onUnlinkProduct}
                        onLinkProduct={onLinkProduct}
                        onOpenPicker={(targetItem, targetIdx) =>
                          setPickerTarget({ item: targetItem, index: targetIdx })
                        }
                      />

                      {/* Unit Mismatch */}
                      {hasUnitMismatch && (
                        <button
                          type="button"
                          onClick={() => setPackTarget({ item, index: originalIndex })}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors"
                          title="Click to convert pack to pieces"
                        >
                          <Layers className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Convert Unit ({item.unit} → {item.catalog_unit})</span>
                        </button>
                      )}
                    </div>

                    {/* Product Name & Action Controls */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onOpenItemModal(item, originalIndex)}
                          className="text-left font-semibold text-xs sm:text-sm text-zinc-900 hover:text-emerald-700 transition-colors block line-clamp-2"
                          title="Click to edit cost, retail, and quantity in modal"
                        >
                          {item.name}
                        </button>

                        {item.original_name && item.original_name !== item.name && (
                          <span
                            className="text-[11px] text-zinc-400 font-mono block truncate mt-0.5"
                            title={item.original_name}
                          >
                            Receipt: {item.original_name}
                          </span>
                        )}

                        {item.matched_product_name && item.matched_product_name !== item.name && (
                          <span
                            className="text-[11px] text-emerald-700 font-medium block truncate mt-0.5"
                            title={`Matched catalog item: ${item.matched_product_name}`}
                          >
                            Matched: {item.matched_product_name}
                          </span>
                        )}

                        {/* Glanceable Compact Pill: ₱{retail} · {qty} {unit} */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono bg-zinc-100/90 text-zinc-900 border border-zinc-200/80 shadow-2xs">
                            <span className="font-bold">₱{retail.toFixed(2)}</span>
                            <span className="text-zinc-400">·</span>
                            <span className="text-zinc-700 font-medium">
                              {item.stock_quantity} {item.unit}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Actions: Edit button (opens modal) & 3-dot dropdown */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenItemModal(item, originalIndex)}
                          className="h-8 px-2.5 text-xs gap-1.5 text-zinc-700 hover:text-zinc-900 border-zinc-300 hover:bg-zinc-100"
                          title="Open modal to edit cost, retail, and quantity"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>

                        <QueueRowDropdown
                          item={item}
                          originalIndex={originalIndex}
                          isLinked={isLinked}
                          hasUnitMismatch={hasUnitMismatch}
                          onOpenPicker={(targetItem, targetIdx) =>
                            setPickerTarget({ item: targetItem, index: targetIdx })
                          }
                          onOpenPackModal={(targetItem, targetIdx) =>
                            setPackTarget({ item: targetItem, index: targetIdx })
                          }
                          onOpenEditModal={(targetItem, targetIdx) =>
                            onOpenItemModal(targetItem, targetIdx)
                          }
                          onDeleteItem={onDeleteItem}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Product Picker Modal */}
      <ProductPickerModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        scannedItem={pickerTarget ? pickerTarget.item : null}
        catalogProducts={catalogProducts}
        onSelectProduct={(prod) => {
          if (pickerTarget) {
            onLinkProduct(pickerTarget.index, prod);
          }
        }}
        onUnlink={() => {
          if (pickerTarget) {
            onUnlinkProduct(pickerTarget.index);
          }
        }}
      />

      {/* Pack Conversion Modal */}
      <PackConversionModal
        isOpen={packTarget !== null}
        onClose={() => setPackTarget(null)}
        scannedItem={packTarget ? packTarget.item : null}
        onApplyConversion={(pieces) => {
          if (packTarget) {
            onConvertPack(packTarget.index, pieces);
          }
        }}
      />
    </>
  );
}
