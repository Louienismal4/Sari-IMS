"use client";

import { useMemo } from "react";
import { Product } from "@/features/products/types/product.types";

export function useDashboardMetrics(products: Product[]) {
  return useMemo(() => {
    const totalSKUs = products.length;
    const totalUnits = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
    const lowStockCount = products.filter((p) => p.stock_quantity <= p.reorder_level).length;

    const totalCapital = products.reduce(
      (acc, p) => acc + (parseFloat(p.cost_price) || 0) * (p.stock_quantity || 0),
      0
    );
    const totalRevenue = products.reduce(
      (acc, p) => acc + (parseFloat(p.selling_price) || 0) * (p.stock_quantity || 0),
      0
    );
    const totalTubo = totalRevenue - totalCapital;
    const overallMargin = totalCapital > 0 ? ((totalTubo / totalCapital) * 100).toFixed(1) : "0";

    return {
      totalSKUs,
      totalUnits,
      lowStockCount,
      totalCapital,
      totalRevenue,
      totalTubo,
      overallMargin,
    };
  }, [products]);
}
