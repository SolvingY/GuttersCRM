

# Fix Contract PDF Header and Layout

## Issues from Screenshot
1. The PDF header only shows "Next Generation Guttering" -- it needs to also show "Next Generation Roofing"
2. Content on the left side is being cut off/overlapping due to tight margins and label positioning

## Changes

### File: `src/lib/generateContractPDF.ts`

**Header Fix (lines ~60-71)**
- Update the header to display two company names:
  - Line 1: "Next Generation Roofing" (font size 16, bold)
  - Line 2: "Next Generation Guttering" (font size 16, bold)
  - Line 3: "INSTALLATION CONTRACT" (font size 12)
  - Line 4: Address / phone / website info line
- Adjust vertical spacing (y increments) to accommodate the extra line

**Layout / Overlap Fix**
- Increase left margin from 15mm to 18mm to prevent left-side content from being clipped
- Increase the label-to-value offset in the Contract Terms section from 42mm to 45mm so values don't overlap their labels
- Recalculate `contentW` based on the new margin value

## Technical Details

| Section | Current | New |
|---------|---------|-----|
| Header line 1 | "Next Generation Guttering" (18pt) | "Next Generation Roofing" (16pt) |
| Header line 2 | (none) | "Next Generation Guttering" (16pt) |
| Left margin | 15mm | 18mm |
| Contract Terms label offset | 42mm | 45mm |

Only one file is modified: `src/lib/generateContractPDF.ts`

