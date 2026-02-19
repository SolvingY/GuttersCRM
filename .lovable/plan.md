
# Fix Blank Estimates + Add Discount Percentage

## Bug: Blank Estimates on Reopen

**Root Cause:** Line 342 saves `measurement_data` using `JSON.stringify()`, but the column is JSONB. Supabase automatically serializes objects for JSONB columns, so the data gets double-encoded -- stored as a JSON string inside JSON. When read back, `measurement_data` is a raw string like `"{\"protProduct\":...}"` instead of a parsed object. All the `d?.protProduct` checks in the restore `useEffect` (line 246) silently fail because you can't access properties on a string.

**Fix:** Remove `JSON.stringify()` on line 342 -- pass the object directly:

```tsx
// Before (broken):
measurement_data: JSON.stringify({ protProduct, protRows, ... }),

// After (fixed):
measurement_data: { protProduct, protRows, gutterSize, gutterColor, gutterRows, downspouts, elbows, addons, quotedTotal, dsType },
```

Also add a safety parse in the restore `useEffect` in case any previously double-encoded estimates exist in the database:

```tsx
useEffect(() => {
  if (!existingEstimate) return;
  let d = existingEstimate.measurement_data;
  // Handle previously double-encoded data
  if (typeof d === "string") {
    try { d = JSON.parse(d); } catch { return; }
  }
  if (!d) return;
  if (d.protProduct) setProtProduct(d.protProduct);
  // ... rest of restore logic
}, [existingEstimate?.id]);
```

---

## New Feature: Discount Percentage for Commission

Add a discount percentage input below the commission slider that lets the rep reduce their commission by a percentage.

**New state:**
```tsx
const [discountPct, setDiscountPct] = useState<number>(0);
```

**Calculation changes:**
- `discountedCommission = totalCommission * (1 - discountPct / 100)`
- Display both the original commission and the discounted commission
- The discount only affects the rep's take-home commission, not the quoted price

**UI placement:** Below the existing slider section, inside the `no-print` block (since this is internal-only). A simple row with:
- Label: "DISCOUNT %"
- A number input (0-100)
- Display: "Discounted Commission: $X,XXX.XX"
- Visual indicator showing how much they're giving up

**Save/Restore:** Include `discountPct` in `measurement_data` so it persists with the estimate. Restore it in the `useEffect`.

---

## Files Modified

| File | Change |
|---|---|
| `src/components/NGRGutterCalculator.tsx` | Fix `JSON.stringify` bug, add string-parse safety in restore, add `discountPct` state + UI + save/restore |

## Technical Details

1. **Line 342**: Change `measurement_data: JSON.stringify({...})` to `measurement_data: {...}` (remove stringify)
2. **Lines 243-262**: Add `typeof d === "string"` safety parse in the restore useEffect, add `discountPct` restore
3. **Line 305**: Add `discountedCommission` calculation after `totalCommission`
4. **After line 679 (slider section)**: Add discount percentage input UI
5. **Line 342**: Add `discountPct` to measurement_data object
6. **Line 672**: Update commission display to show discounted value when discount > 0
7. **Summary rows**: Optionally show discounted commission in the grand total row
