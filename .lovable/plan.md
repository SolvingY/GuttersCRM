

# Lead Card: Rep Files, Print Quote Cleanup, Scope of Work, and Warranties

## Summary

Three categories of changes across 3 files: (1) enable reps to upload files/photos from their lead view, (2) sanitize the print quote to hide all internal pricing and show only grand total, and (3) add professional print-only content including scope of work, warranty language with calculated rebate, and footer.

---

## Part 1: LeadFilesSection.tsx -- Add "Photo" file type

Add `{ value: "photo", label: "Photo" }` to `fileTypeOptions` array and `photo: "bg-amber-500/10 text-amber-600 border-amber-500/30"` to `fileTypeBadgeClasses`.

## Part 2: LeadDetailView.tsx -- Add LeadFilesSection for reps

Import `LeadFilesSection` and add it after the Photos section (line 278), before the Activity Log, passing `leadId={lead.id}` and `isAdmin={false}`.

## Part 3: NGRGutterCalculator.tsx -- Print sanitization and print-only content

### 3a. Add `no-print` classes to hide internal pricing

Elements to hide in print:
- Line 474: Product `SelectPill` -- wrap in `no-print` div
- Lines 475-479: Per-foot pricing bar (Retail/ft, Floor/ft, Commission/ft) -- add `className="no-print"`
- Lines 501-507: Gutter size/color `SelectPill` blocks -- wrap in `no-print` div
- Lines 509-513: Gutter per-foot pricing bar -- add `className="no-print"`
- Line 158: MeasurementTable "Row Retail" column header -- add `className="no-print"`
- Lines 184-188: MeasurementTable "Row Retail" data cells -- add `className="no-print"`
- Lines 531-533: Downspout grid headers "Rate/ft", "Retail", "Floor" -- add `className="no-print"`
- Lines 544-546: Downspout row cells for Rate, Retail, Floor -- add `className="no-print"`
- Lines 549-553: DS TOTAL rate/retail/floor cells -- add `className="no-print"`
- Lines 561: Elbow pricing rate SelectPill -- add `className="no-print"`
- Lines 565-566: Elbow grid headers Rate/ft, Retail, Floor -- add `className="no-print"`
- Lines 578-580: Elbow row cells for Rate, Retail, Floor -- add `className="no-print"`
- Lines 586-588: Elbow total rate/retail/floor cells -- add `className="no-print"`
- Line 488: Protection section "Retail" StatBar -- add `className="no-print"`
- Line 522: Gutter section "Retail" StatBar -- add `className="no-print"`
- Line 597: Combined DS+Elbow "Retail" StatBar -- add `className="no-print"`
- Line 607: Gutters Section Total "Retail" StatBar -- add `className="no-print"`
- Line 640: Add-On "Retail" StatBar -- add `className="no-print"`
- Lines 447-449: Auto-fill banner -- add `className="no-print"`
- Line 731-733: 4th story warning -- add `className="no-print"`
- Lines 656-659: Per-section SummaryRow components (Protection, Gutters, DS+Elbows, Add-Ons) -- wrap in `no-print` div
- Lines 649-655: Summary column headers (Section, Retail, Floor, Quoted, Commission) -- wrap in `no-print` div
- Line 660: Spacer div between section rows and total -- add `className="no-print"`
- Lines 620-621: Add-on grid "Retail" and "Floor" column headers -- add `className="no-print"`
- Lines 633-634: Add-on row retail/floor cells -- add `className="no-print"`

### 3b. Update print-only header (lines 414-423)

Replace the existing print header with:
- Same `ngrLogo` (already imported from `@/assets/ngr-logo-circle.jpg`) centered at 100x100px
- Title: "Next Generation Guttering" (large bold)
- Subtitle: "Customer Estimate"
- Date: `new Date().toLocaleDateString()`
- Horizontal rule below

### 3c. Add print-only Scope of Work section (new, after header)

A `print-only` div listing active line items:
- Protection (if `protCalc.footage > 0`): product name + footage
- Gutters (if `gutterCalc.footage > 0`): size + color + footage
- DS + Elbows (if `dsTotal.footage > 0`): combined footage
- Add-Ons: each addon with qty > 0, showing name + qty + unit

Grand Total prominently displayed:
```
TOTAL INVESTMENT: $X,XXX.XX
```

### 3d. Add print-only Gutter Warranty section (if `gutterCalc.footage > 0`)

Title: "Gutter Warranties and Guarantees"
- Lifetime Leak-Free Guarantee -- With yearly scheduled inspection
- 10% Rebate Toward Future Roof Replacement -- shows **calculated dollar amount**: `$${(clampedQuoted * 0.10).toFixed(2)}` applied toward any future NGR roof replacement
- 25-Year Baked-On Paint Warranty -- Applies to gutters and downspouts
- Fine print disclaimer

### 3e. Add print-only Gutter Protection Warranty section (if `protCalc.footage > 0`)

Title: "Gutter Protection Warranty"
- Hydro Flow Mesh + Frame: 45-Year Manufacturer Warranty
- Pro Flo Mesh: 45-Year Manufacturer Warranty
- Gutter RX Collector: 10-Year Manufacturer Warranty
- Cheap Mesh: info note -- "Manufacturer warranty not available for this product. Ask your rep about upgrading to a warranted protection product."
- Fine print disclaimer (for all except Cheap Mesh)

### 3f. Add print-only footer

At the bottom of the print page:
- `ngrLogo` at 40px
- "Next Generation Guttering | nextgenerationroofing.com"
- "Thank you for choosing Next Generation Guttering"

### 3g. Add print CSS to existing style block

New rules inside `@media print {}`:
```css
.warranty-section { border: 1px solid #ddd; border-radius: 6px; padding: 16px; margin: 16px 0; page-break-inside: avoid; }
.warranty-item { padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.warranty-fine-print { font-size: 10px; color: #666 !important; margin-top: 8px; font-style: italic; }
.grand-total-print { font-size: 24px; font-weight: 900; text-align: center; padding: 20px; border: 2px solid #000; border-radius: 8px; margin: 20px 0; }
.scope-item { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
.print-footer { margin-top: 40px; text-align: center; border-top: 1px solid #ddd; padding-top: 16px; page-break-inside: avoid; }
```

---

## Files Changed

| File | Action |
|---|---|
| `src/components/NGRGutterCalculator.tsx` | Edit -- add no-print to ~20 internal elements; update print header; add print-only Scope of Work, Warranty sections (with calculated rebate and Cheap Mesh note), and Footer; add print CSS |
| `src/pages/dashboard/LeadDetailView.tsx` | Edit -- import and add LeadFilesSection after Photos |
| `src/components/admin/LeadFilesSection.tsx` | Edit -- add "photo" to fileTypeOptions and badge classes |

---

## Technical Notes

- No database changes required
- No new dependencies or assets -- reuses existing `ngrLogo` import from `@/assets/ngr-logo-circle.jpg`
- All new print content uses `className="print-only"` which is already defined in the component's style block
- The rebate warranty line calculates `clampedQuoted * 0.10` to show a real dollar amount
- The Cheap Mesh note uses an informational message instead of omitting the warranty section entirely
- The MeasurementTable sub-component's "Row Retail" column gets `className="no-print"` on both header and data cells
- Per-section SummaryRows are wrapped in a single `no-print` div so only the bold GRAND TOTAL row prints

