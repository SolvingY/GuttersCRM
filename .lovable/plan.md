

# Separate Gutter and Protection Pricing on PDF Line Items

## Problem

Currently, the PDF shows the full `clampedQuoted` (total) price on the Gutters & Downspouts line item and no price on the Protection line item. The user wants each line item to display its own proportional price.

## Solution

Add two new fields to the `EstimatePDFData` interface: `gutterDsQuoted` and `protQuoted`. These represent the portion of the total quoted price attributable to each section. The PDF will display each price next to its respective line item.

### Price Proportioning Logic

Since the user may apply a discount that reduces the total, we proportionally split the quoted price based on each section's share of total retail:

```text
gutterDsQuoted = (gutterRetail + dsRetail) / totalRetail * clampedQuoted
protQuoted     = protRetail / totalRetail * clampedQuoted
```

This ensures the individual line items sum to the total and the discount is distributed proportionally.

---

## Files Changed

### 1. `src/lib/generateEstimatePDF.ts`

- Add `gutterDsQuoted` and `protQuoted` (both optional numbers) to the `EstimatePDFData` interface
- On the Gutters & Downspouts line (line 176), display `fmt(gutterDsQuoted)` instead of `fmt(clampedQuoted)`
- On the Protection line (line 195), add `fmt(protQuoted)` right-aligned
- Remove the rebate warranty line from under the gutter scope item (the "10% Rebate Toward Future Roof Replacement" line) since the rebate already appears below the Grand Total box

### 2. `src/components/NGRGutterCalculator.tsx`

- Calculate and pass `gutterDsQuoted` and `protQuoted` to `buildEstimatePDF()`:
  ```text
  gutterDsQuoted: (gutterCalc.retail + dsTotal.retail) / (totalRetail || 1) * clampedQuoted
  protQuoted: protCalc.retail / (totalRetail || 1) * clampedQuoted
  ```

### 3. `src/components/admin/QuoteApprovalSection.tsx`

- Calculate and pass `gutterDsQuoted` and `protQuoted` using the estimate's stored retail values:
  ```text
  gutterDsRetail = gutter_retail + ds_elbow_retail
  protRetail = protection_retail
  totalRetail = estimate.total_retail
  ```

## What Does NOT Change

- Pricing logic, discount calculations, or the on-screen calculator UI
- The Grand Total box still shows the full `clampedQuoted`
- The rebate value line below the Grand Total remains unchanged
- No other files are modified

