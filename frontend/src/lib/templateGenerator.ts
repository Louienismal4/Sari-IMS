/**
 * Utility to generate and download a sample CSV template for inventory imports.
 */

// Helper to sanitize CSV cells against formula injection (CWE-1236)
function sanitizeCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function downloadSampleInventoryCsv(): void {
  const headers = [
    "Name",
    "Barcode",
    "Category",
    "Unit",
    "Cost Price",
    "Selling Price",
    "Stock Quantity",
    "Reorder Level",
    "Original Name",
  ];

  const sampleRows = [
    [
      "Coca-Cola 1.5L",
      "4800016644002",
      "Beverages",
      "pc",
      "58.00",
      "70.00",
      "24",
      "5",
      "COKE 1.5L",
    ],
    [
      "Bear Brand Fortified 33g",
      "4800361376511",
      "Dairy & Milk",
      "sachet",
      "14.50",
      "18.00",
      "48",
      "10",
      "BEAR BRAND 33G",
    ],
    [
      "Lucky Me Pancit Canton Kalamansi 80g",
      "4807770270024",
      "Noodles & Instant",
      "pack",
      "13.00",
      "16.00",
      "36",
      "8",
      "LM CANTON KAL",
    ],
    [
      "Safeguard Pure White 60g",
      "4902430756785",
      "Personal Care",
      "bar",
      "22.00",
      "27.00",
      "15",
      "3",
      "SAFEGUARD WHITE 60G",
    ],
    [
      "Silver Swan Soy Sauce 1L",
      "4800042120013",
      "Condiments & Sauces",
      "bottle",
      "38.00",
      "48.00",
      "12",
      "2",
      "SILVER SWAN SOY 1L",
    ],
  ];

  const csvContent = [
    headers.join(","),
    ...sampleRows.map((row) => row.map(sanitizeCell).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "sari_inventory_sample_template.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
