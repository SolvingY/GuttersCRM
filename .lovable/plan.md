

# Fix Contract PDF Header and Layout

## Overview
Update the contract PDF to show both company names and fix text overlap issues.

## Changes (single file: `src/lib/generateContractPDF.ts`)

### 1. Header -- Add "Next Generation Roofing"
Replace the single company name with two lines:
- "Next Generation Roofing" (16pt bold)
- "Next Generation Guttering" (16pt bold)
- "INSTALLATION CONTRACT" (12pt)
- Address/phone/website info line

### 2. Fix Overlap -- Widen Margins and Offsets
- Increase left margin from 15mm to 18mm
- Increase Contract Terms label-to-value offset from 42mm to 45mm (two locations: the terms loop and the Sales Rep line)

These are small, targeted edits to four specific spots in the file. No other files are affected.

