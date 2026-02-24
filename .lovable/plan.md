

# Fix Contract PDF Header and Layout

## Issues from Screenshot
1. The PDF header only shows "Next Generation Guttering" -- it needs to also show "Next Generation Roofing"
2. Content on the left side is being cut off/overlapping, likely due to tight margins or label positioning

## Changes

### File: `src/lib/generateContractPDF.ts`

**Header Fix (lines 60-71)**
- Change the header to show both company names:
  - Line 1: "Next Generation Roofing" (font size 16)
  - Line 2: "Next Generation Guttering" (font size 16)
  - Line 3: "INSTALLATION CONTRACT" (font size 12)
  - Line 4: Address/phone/website line
- Adjust vertical spacing to accommodate the extra line

**Layout/Overlap Fix**
- Increase left margin from 15mm to 18mm to prevent content cutoff
- Increase the label offset for Contract Terms from 42mm to 45mm so values don't overlap their labels
- These small adjustments will prevent the left-side text from being clipped on mobile PDF viewers

## Technical Details

| File | Change |
|------|--------|
| `src/lib/generateContractPDF.ts` | Update header to include both company names; widen margins to fix overlap |
