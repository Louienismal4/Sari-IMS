---
name: Sari-Sari Store Inventory
description: Crisp, high-contrast retail utility dashboard for daily stock & margin monitoring
colors:
  primary: "#3b82f6"
  surface: "#ffffff"
  surface-container: "#f8fafc"
  text-primary: "#0f172a"
  text-muted: "#64748b"
  border: "#e2e8f0"
  border-input: "#cbd5e1"
  success: "#059669"
  success-bg: "#ecfdf5"
  alert: "#be123c"
  alert-bg: "#ffe4e6"
typography:
  display:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  mono:
    fontFamily: "var(--font-geist-mono), monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
rounded:
  sm: "6px"
  md: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  badge-stock-ok:
    backgroundColor: "{colors.success-bg}"
    textColor: "{colors.success}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
  badge-stock-low:
    backgroundColor: "{colors.alert-bg}"
    textColor: "{colors.alert}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
---

# Design System: Sari-Sari Store Inventory

## Overview

**Creative North Star: "The Neighborhood Ledger"**

The design language of the Sari-Sari Store Inventory system embodies the clarity, reliability, and immediate scannability of a well-kept retail ledger. Purpose-built for store owners operating in dynamic retail environments, the UI prioritizes rapid visual parsing—allowing users to verify stock numbers, check profit margins, and search item barcodes instantly without visual distraction.

Neutral surfaces (`#f8fafc` canvas, `#ffffff` containers) are structured with crisp, subtle borders (`#e2e8f0`) and subtle shadows (`shadow-sm`) to define distinct content zones. Color is applied with deliberate functional economy: vibrant blue accents mark active inputs, emerald greens highlight positive margins and healthy stock levels, while rose reds call immediate attention to low stock alerts and system errors.

**Key Characteristics:**
- **High Scannability**: Distinct typographic hierarchy and visual spacing for instant item evaluation.
- **Functional Color Economy**: Color communicates status (green = healthy stock, red = low stock, blue = focus).
- **Tactile Structure**: Light gray container cards with rounded corners (`12px`) and subtle borders (`1px solid #e2e8f0`).
- **Dense Precision**: Clean monospace formatting for barcodes, item units, and numeric counts.

## Colors

The palette relies on slate neutrals as a high-legibility foundation, paired with purposeful status colors for retail monitoring.

### Primary
- **Focus Blue** (`#3b82f6`): Used exclusively for active input focus rings and interactive emphasis.

### Neutral
- **Slate Canvas** (`#f8fafc`): Page background providing high contrast behind white cards.
- **Pure Surface** (`#ffffff`): Container card and table background.
- **Deep Slate Text** (`#0f172a`): Primary headings and price numbers for maximum readability.
- **Muted Slate Text** (`#64748b`): Subtitles, helper text, and secondary labels.
- **Slate Border** (`#e2e8f0`): Structural containment lines between table rows and around card modules.

### Status & Accents
- **Emerald Profit & Healthy Stock** (`#059669` / `#ecfdf5`): Highlight profit margin increases and normal stock counts.
- **Rose Alert & Low Stock** (`#be123c` / `#ffe4e6`): Highlight products at or below reorder threshold.

### Named Rules
**The Rarity Rule.** Status colors (rose red, emerald green, focus blue) must appear on ≤15% of the screen surface. Neutral slate dominates the UI so alerts stand out immediately.

## Typography

**Display Font:** Geist Sans (`var(--font-geist-sans)` fallback `system-ui, sans-serif`)
**Body Font:** Geist Sans (`var(--font-geist-sans)` fallback `system-ui, sans-serif`)
**Mono Font:** Geist Mono (`var(--font-geist-mono)` fallback `monospace`)

**Character:** Clean, modern, highly legible sans-serif paired with a precise monospace font for codes and numbers.

### Hierarchy
- **Display** (Bold 700, `1.5rem` / `24px`, line-height `2rem`): Main app header title.
- **Headline** (SemiBold 600, `1rem` / `16px`, line-height `1.5rem`): Table header titles.
- **Title** (Medium 500, `0.875rem` / `14px`, line-height `1.25rem`): Item names in inventory table.
- **Body** (Regular 400, `0.875rem` / `14px`, line-height `1.25rem`): Category names and unit labels.
- **Label / Mono** (Regular 400, `0.75rem` / `12px`, uppercase / monospace): Barcode identifiers and unit indicators.

## Layout

The spatial model uses a single-column container (`max-w-6xl`) centered on the viewport with flexible padding (`p-6 sm:p-10`). Content is stacked vertically with uniform `1.5rem` (`24px`) spacing (`space-y-6`). On desktop, headers align title left and search bar right; on mobile screens, headers stack vertically for seamless single-handed navigation.

## Elevation & Depth

The system uses a flat-by-default tonal layering strategy. Surfaces rely on white-on-slate background contrast (`bg-white` on `bg-slate-50`) bounded by thin neutral strokes (`1px solid #e2e8f0`).

### Shadow Vocabulary
- **Card Ambient** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Applied to header cards and table containers to establish slight separation from the background canvas.

### Named Rules
**The Flat-Boundary Rule.** Depth is created through surface contrast and subtle borders rather than heavy ambient drop shadows.

## Shapes

Forms are defined by friendly yet structured geometric corners:
- **Card Containers**: `12px` (`rounded-xl`)
- **Inputs & Search**: `8px` (`rounded-lg`)
- **Badges & Indicators**: `6px` (`rounded-md`) for stock pills, `9999px` (`rounded-full`) for category tags.

## Components

### Header Container
- **Shape**: `12px` radius (`rounded-xl`)
- **Background**: `#ffffff` with `1px solid #e2e8f0` stroke
- **Padding**: `1.5rem` (`24px`)
- **Layout**: Flexbox header with responsive search bar alignment

### Search Input
- **Shape**: `8px` radius (`rounded-lg`)
- **Background**: `#ffffff` with `#cbd5e1` stroke
- **Padding**: `0.5rem 1rem` (`8px 16px`)
- **Focus**: `focus:ring-2 focus:ring-blue-500` ring indicator

### Inventory Table
- **Shape**: `12px` outer container radius with overflow clip
- **Header**: `#f8fafc` background, `#334155` text, bottom border `#e2e8f0`
- **Row Padding**: `1rem` (`16px`) per cell
- **Hover**: `hover:bg-slate-50/50` subtle row highlight

### Stock Status Pills
- **Healthy Stock Pill**: Background `#ecfdf5`, text `#047857`, font size `12px` bold, `6px` radius.
- **Low Stock Pill**: Background `#ffe4e6`, text `#be123c`, font size `12px` bold, `6px` radius.

## Do's and Don'ts

### Do:
- **Do** format barcodes and numeric identifiers using `Geist Mono` (`font-mono`) in smaller text sizes (`12px`).
- **Do** display cost price, selling price, and profit margin in dedicated columns to keep calculations explicit.
- **Do** use clear visual badges (`rose-100` vs `emerald-50`) to highlight low-stock products instantly.

### Don't:
- **Don't** use heavy drop shadows or glowing gradients on inventory cards.
- **Don't** use ambiguous icons without text labels for critical stock actions.
- **Don't** remove table row borders; clear horizontal dividers are mandatory for scanability.
