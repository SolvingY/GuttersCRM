

# Fix Contract Scope of Work and Status Dropdown Order

## Issue 1: Contract Scope of Work Doesn't Match Estimate

**Problem:** The contract currently generates scope text like `335ft 5" gutters, 0ft Hydro Flow Mesh + Frame` using raw footage numbers. The estimate PDF shows a formatted label like `5" Standard Gutters & 2x3 Downspouts` with price, warranties, and protection as a separate line item.

**Fix in `src/pages/dashboard/forms/GutterContract.tsx`:**

Replace the scope-of-work generation logic (lines 99-110) to match the PDF estimate format from `generateEstimatePDF.ts`:

- Build the gutter/downspout label the same way the PDF does: `{gutterSize} {colorLabel} Gutters & {dsDisplaySize} Downspouts` with the quoted price
- Add protection product as a separate line if present (e.g., `Hydro Flow Mesh + Frame`)
- Use the estimate fields: `gutter_size`, `gutter_color`, `gutter_footage`, `protection_product`, `protection_footage`, and `measurement_data` (which contains `dsType`)
- Example output: `5" Standard Gutters & 2x3 Downspouts — $4,345.00`
- If protection exists and has footage > 0: add second line like `Hydro Flow Mesh + Frame — $X,XXX.00`

The logic will mirror what `generateEstimatePDF.ts` does at lines 163-200.

## Issue 2: Status Dropdown Order

**Problem:** Current order in `LeadDetailView.tsx` line 28 is:
`["new", "contacted", "quoted", "scheduled", "won", "lost", "completed"]`

The user wants: **New, Contacted, Quoted, Won, Lost, Scheduled, Completed**

**Fix in `src/pages/dashboard/LeadDetailView.tsx`:**

Change line 28 to:
```
const statusOptions = ["new", "contacted", "quoted", "won", "lost", "scheduled", "completed"];
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/dashboard/forms/GutterContract.tsx` | Rewrite scope-of-work generation to match estimate PDF format |
| `src/pages/dashboard/LeadDetailView.tsx` | Reorder status dropdown: New, Contacted, Quoted, Won, Lost, Scheduled, Completed |

