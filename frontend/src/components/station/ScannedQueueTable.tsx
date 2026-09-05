"use client";

import {
  Package,
  Check,
  Loader2,
  Search,
  X,
  MoreVertical,
  Edit3,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ScannedItem } from "@/types/inventory";

interface ScannedQueueTableProps {
  scannedItems: ScannedItem[];
  filteredScannedItems: ScannedItem[];
  tableSearch: string;
  setTableSearch: (val: string) => void;
  batchImporting: boolean;
  onClearQueue: () => void;
  onBatchImport: () => void;
  onUpdateItemField: (index: number, field: keyof ScannedItem, val: string | number) => void;
  onOpenItemModal: (item: ScannedItem, index: number) => void;
  onDeleteItem: (index: number) => void;
}

export function ScannedQueueTable({
  scannedItems,
  filteredScannedItems,
  tableSearch,
  setTableSearch,
  batchImporting,
  onClearQueue,
  onBatchImport,
  onUpdateItemField,
  onOpenItemModal,
  onDeleteItem,
}: ScannedQueueTableProps) {
  return (
    <>
      {/* Header Strip & Search Filter */}
      <CardHeader className="p-4 border-b border-zinc-200 space-y-3 bg-zinc-50/80 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-zinc-900">
              Receipt Queue ({scannedItems.length})
            </h3>
            <p className="text-xs text-zinc-500">
              Changes update here first. Click &quot;Import All&quot; when ready to sync to inventory.
            </p>
          </div>

          {scannedItems.length > 0 && (
            <div className="flex items-center gap-2">
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
                    <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
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

        {/* Search Input */}
        {scannedItems.length > 0 && (
          <div className="relative">
            <Input
              type="text"
              placeholder="Filter queue by name, original receipt name, or category..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-8 pr-7 text-xs font-mono"
              aria-label="Filter receipt queue"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
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
        {filteredScannedItems.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 space-y-2.5 my-auto">
            <Package className="w-8 h-8 mx-auto text-zinc-300" />
            <p className="text-xs font-semibold text-zinc-700">
              {scannedItems.length === 0 ? "Scan queue is empty" : "No matching items in queue"}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {scannedItems.length === 0
                ? "Upload or snap a receipt photo on the right to extract items into this queue."
                : "Try a different search keyword."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-zinc-50/95 backdrop-blur-xs z-10">
              <TableRow>
                <TableHead className="w-[38%]">Item Name &amp; Original</TableHead>
                <TableHead className="text-right w-[16%]">Cost (₱)</TableHead>
                <TableHead className="text-right w-[16%]">Retail (₱)</TableHead>
                <TableHead className="text-center w-[14%]">Qty</TableHead>
                <TableHead className="text-right w-[16%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScannedItems.map((item, idx) => {
                const cost = parseFloat(item.cost_price) || 0;
                const retail = parseFloat(item.selling_price) || 0;
                const itemMargin = cost > 0 ? (((retail - cost) / cost) * 100).toFixed(0) : "0";

                return (
                  <TableRow key={idx}>
                    {/* Inline Editable Item Name */}
                    <TableCell>
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) => onUpdateItemField(idx, "name", e.target.value)}
                        className="h-8 text-xs font-semibold text-zinc-900 border-zinc-200 focus:border-zinc-900"
                        title="Click to rename item"
                        aria-label={`Rename item ${item.name}`}
                      />
                      <div className="text-xs text-zinc-500 font-mono mt-1 flex items-center gap-1 truncate">
                        <span className="font-semibold text-zinc-600">Original:</span>
                        <span className="truncate" title={item.original_name}>
                          {item.original_name || item.name}
                        </span>
                      </div>
                    </TableCell>

                    {/* Cost (Read-Only) */}
                    <TableCell className="text-right font-mono text-zinc-700 font-medium text-xs">
                      ₱{cost.toFixed(2)}
                    </TableCell>

                    {/* Retail (Read-Only) */}
                    <TableCell className="text-right">
                      <div className="font-mono font-bold text-zinc-900 text-xs">
                        ₱{retail.toFixed(2)}
                      </div>
                      <span className="text-[11px] text-emerald-600 font-mono block mt-0.5 font-medium">
                        +{itemMargin}% margin
                      </span>
                    </TableCell>

                    {/* Qty (Read-Only) */}
                    <TableCell className="text-center font-mono text-zinc-800 text-xs">
                      <span className="font-semibold">{item.stock_quantity}</span>{" "}
                      <span className="text-xs text-zinc-500 font-mono">{item.unit}</span>
                    </TableCell>

                    {/* Row Actions */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 min-h-[44px] min-w-[44px] text-zinc-500 hover:text-zinc-800"
                            aria-label={`Open actions for ${item.name}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenItemModal(item, idx)}>
                            <Edit3 className="w-3.5 h-3.5 text-zinc-500 mr-2" />
                            <span>Calculator &amp; Margin</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDeleteItem(idx)}
                            className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            <span>Remove</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
