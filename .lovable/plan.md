

# Fix Print Quote: Two-Section Architecture

## Problem
The print CSS uses piecemeal `no-print` classes but the entire calculator UI (measurement tables, input fields, pricing columns, summary with two price columns) is still printing through, spanning multiple pages.

## Solution — Single file change: `src/components/NGRGutterCalculator.tsx`

### 1. Replace CSS block (lines 405-417)

Replace the current `@media print` CSS with a two-section architecture that hides the entire calculator on print and only shows the customer document:

```css
.print-only { display: none !important; }
.screen-only { display: block; }
@media print {
  .screen-only { display: none !important; }
  .print-only { display: block !important; }
  body { margin: 0; padding: 20px; background: white !important; color: #111 !important; font-size: 12px; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; color: #111 !important; border-color: #ccc !important; }
  .warranty-section { border: 1px solid #ddd; border-radius: 6px; padding: 8px; margin: 8px 0; page-break-inside: avoid; }
  .warranty-item { padding: 4px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .warranty-fine-print { font-size: 11px; color: #666 !important; margin-top: 6px; font-style: italic; }
  .grand-total-print { font-size: 20px; font-weight: 900; text-align: center; padding: 12px; border: 2px solid #000; border-radius: 8px; margin: 12px 0; }
  .scope-item { padding: 6px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
  .print-footer { margin-top: 20px; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; page-break-inside: avoid; }
}
```

Key changes from current CSS:
- Remove `.no-print` rule (no longer needed)
- Add `.screen-only` rule
- Add `font-size: 12px` to print body for single-page fit
- Reduce grand-total from 24px to 20px, padding from 20px to 12px
- Reduce warranty padding from 16px to 8px, warranty-item from 6px to 4px
- Reduce footer margin from 40px to 20px

### 2. Wrap entire screen UI in `screen-only` div

**Opening tag**: Insert `<div className="screen-only">` at line 511, just before the on-screen HEADER comment. Remove the `className="no-print"` from the header div on line 512 since it's now inside `screen-only`.

**Closing tag**: Insert `</div>{/* end screen-only */}` at line 848, after the last `</div>` of the actions section but before the final `</div>` wrapper.

This wraps everything the rep sees: header with logo, job info card, tab buttons, all three tab panels (Protection, Gutters, Add-Ons), Estimate Summary with SummaryRow components, slider/discount section, warning, and action buttons.

### 3. Print-only blocks stay in place (lines 420-509)

The existing print-only content (header, scope of work, gutter warranty, protection warranty, footer) remains exactly where it is -- outside the `screen-only` wrapper, above it in the DOM. This ensures it renders first in the print document flow in the correct order:
1. Logo + title + "Customer Estimate" + date
2. Customer name, city, state, job number
3. Scope of Work (active line items)
4. TOTAL INVESTMENT box
5. 10% Rebate value
6. Gutter Warranties (if gutter footage > 0)
7. Protection Warranty (if protection footage > 0)
8. Footer

### 4. No other files changed

This is a single-file CSS architecture fix only. No changes to pricing logic, save functionality, or screen UI.

---

## What this fixes
- Measurement tables with inputs no longer print
- Internal pricing columns (Retail/ft, Floor/ft, Commission) no longer print
- Job info form fields no longer print
- Estimate Summary with two price columns no longer prints
- Slider/discount section no longer prints
- Only the clean 1-page customer document prints

## File changed
| File | Action |
|---|---|
| `src/components/NGRGutterCalculator.tsx` | Edit -- update CSS block (lines 405-417), add `screen-only` wrapper around lines 511-848 |

