"use client";

import {
  MoreVertical,
  Edit3,
  Trash2,
  Plus,
  Minus,
  ArrowUpDown,
  RefreshCw,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Product, SortField } from "@/types/inventory";

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  onSort: (field: SortField) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onStockAdjust: (product: Product, delta: number) => void;
  updatingStockId: number | null;
  onResetFilters?: () => void;
  searchQuery?: string;
}

export function ProductTable({
  products,
  loading,
  onSort,
  onEdit,
  onDelete,
  onStockAdjust,
  updatingStockId,
  onResetFilters,
  searchQuery,
}: ProductTableProps) {
  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-400 space-y-2 my-auto">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
        <p className="text-xs font-mono">Loading product catalog...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-400 space-y-2.5 my-auto">
        <Package className="w-8 h-8 mx-auto text-zinc-300" />
        <p className="text-xs font-semibold text-zinc-700">No items match your filter</p>
        <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
          {searchQuery
            ? `No products found matching "${searchQuery}".`
            : "Try changing your stock filter or category."}
        </p>
        {onResetFilters && (
          <Button
            size="sm"
            variant="outline"
            onClick={onResetFilters}
            className="mt-2 text-xs"
          >
            Reset Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="sticky top-0 bg-zinc-50/95 backdrop-blur-xs z-10">
        <TableRow>
          <TableHead className="w-[34%]">
            <button
              type="button"
              onClick={() => onSort("name")}
              className="flex items-center gap-1 font-semibold text-zinc-700 hover:text-zinc-900"
            >
              <span>Item Name &amp; Barcode</span>
              <ArrowUpDown className="w-3 h-3 text-zinc-400" />
            </button>
          </TableHead>
          <TableHead className="w-[14%]">Category</TableHead>
          <TableHead className="text-right w-[13%]">
            <button
              type="button"
              onClick={() => onSort("cost_price")}
              className="flex items-center gap-1 font-semibold text-zinc-700 hover:text-zinc-900 ml-auto"
            >
              <span>Capital</span>
              <ArrowUpDown className="w-3 h-3 text-zinc-400" />
            </button>
          </TableHead>
          <TableHead className="text-right w-[15%]">
            <button
              type="button"
              onClick={() => onSort("selling_price")}
              className="flex items-center gap-1 font-semibold text-zinc-700 hover:text-zinc-900 ml-auto"
            >
              <span>Retail (Tubo)</span>
              <ArrowUpDown className="w-3 h-3 text-zinc-400" />
            </button>
          </TableHead>
          <TableHead className="text-center w-[12%]">
            <button
              type="button"
              onClick={() => onSort("stock_quantity")}
              className="flex items-center gap-1 font-semibold text-zinc-700 hover:text-zinc-900 mx-auto"
            >
              <span>Stock</span>
              <ArrowUpDown className="w-3 h-3 text-zinc-400" />
            </button>
          </TableHead>
          <TableHead className="text-right w-[12%]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((p) => {
          const cost = parseFloat(p.cost_price) || 0;
          const retail = parseFloat(p.selling_price) || 0;
          const tubo = retail - cost;
          const marginPct = cost > 0 ? (((retail - cost) / cost) * 100).toFixed(0) : "0";
          const isLow = p.stock_quantity <= p.reorder_level;
          const isOut = p.stock_quantity === 0;
          const isUpdating = updatingStockId === p.id;

          return (
            <TableRow
              key={p.id}
              className={isOut ? "bg-zinc-100/40 opacity-70" : isLow ? "bg-rose-50/20" : ""}
            >
              {/* Item Name & Details */}
              <TableCell>
                <div className="font-semibold text-zinc-900 text-xs">
                  {p.name}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono flex flex-wrap items-center gap-1.5 mt-0.5">
                  {p.barcode && <span>SKU: {p.barcode}</span>}
                  {p.original_name && p.original_name !== p.name && (
                    <span className="truncate max-w-xs text-zinc-400" title={p.original_name}>
                      • Rec: {p.original_name}
                    </span>
                  )}
                </div>
              </TableCell>

              {/* Category Badge */}
              <TableCell>
                <Badge variant="outline" className="text-[10px] font-mono text-zinc-600 bg-zinc-50">
                  {p.category?.name || "Uncategorized"}
                </Badge>
              </TableCell>

              {/* Capital Cost */}
              <TableCell className="text-right font-mono text-zinc-600 text-xs">
                ₱{cost.toFixed(2)}
              </TableCell>

              {/* Retail Price with Margin */}
              <TableCell className="text-right">
                <div className="font-mono font-bold text-zinc-900 text-xs">
                  ₱{retail.toFixed(2)}
                </div>
                <span className="text-[9px] text-emerald-600 font-mono block">
                  +₱{tubo.toFixed(2)} (+{marginPct}%)
                </span>
              </TableCell>

              {/* Stock Count & Quick Step */}
              <TableCell className="text-center">
                <div className="inline-flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={p.stock_quantity <= 0 || isUpdating}
                    onClick={() => onStockAdjust(p, -1)}
                    className="h-5 w-5 text-zinc-400 hover:text-zinc-700"
                    title="Subtract 1 sale"
                  >
                    <Minus className="w-2.5 h-2.5" />
                  </Button>

                  <Badge
                    variant={isOut ? "destructive" : isLow ? "destructive" : "secondary"}
                    className="font-mono text-[11px] px-1.5 py-0 min-w-12 justify-center"
                  >
                    {p.stock_quantity} {p.unit}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isUpdating}
                    onClick={() => onStockAdjust(p, 1)}
                    className="h-5 w-5 text-zinc-400 hover:text-zinc-700"
                    title="Add 1 restock"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </Button>
                </div>
                {isLow && (
                  <span className="text-[9px] text-rose-600 font-mono block mt-0.5">
                    Min: {p.reorder_level}
                  </span>
                )}
              </TableCell>

              {/* Actions Menu */}
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500">
                      <MoreVertical className="w-4 h-4" />
                      <span className="sr-only">Product Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(p)}>
                      <Edit3 className="w-3.5 h-3.5 text-zinc-500 mr-2" />
                      <span>Edit Product</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(p)}
                      className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      <span>Delete SKU</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
