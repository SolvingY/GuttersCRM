
# Fix Calculator Mobile Layout and Schedule Confirmation Preview

## Problem

The Gutter Calculator's Estimate Summary section and other grid-based sections overflow horizontally on mobile screens. The 5-column and 6-column grids are too wide for 390px viewports, causing text to clip and values to run together (as shown in the uploaded screenshot).

## Changes

### 1. `src/components/NGRGutterCalculator.tsx` -- Mobile-Responsive Grids

**SummaryRow component (line 209)**
- Change the 5-column grid to stack vertically on small screens
- On mobile: show each row as a card-style layout with the section label on top and values in a 2x2 grid below
- On desktop (>640px): keep the existing 5-column grid

**Summary header (line 720)**
- Hide the 5-column header row on mobile since the card layout will have inline labels
- Show it only on wider screens

**Section Summary StatBar groups (lines 554-558, 588-592, etc.)**
- Change from a single flex row to a 2-column grid layout so values wrap properly on mobile instead of running together ("Total Footage**0 ft**" becomes two lines)
- Add `min-width` or explicit gap to prevent label-value collision

**Downspout grid (line 598) and Elbow grid (line 632)**
- Both use `repeat(6, 1fr)` which is too many columns for mobile
- Wrap these in a container with `overflowX: "auto"` (same pattern as the measurement table) OR switch to a card-based layout on mobile
- Simplest fix: wrap in `overflowX: "auto"` container since these are data-entry grids

**Add-ons grid (line 687)**
- Same approach: wrap in `overflowX: "auto"` or use responsive columns

**Grand Total row (line 734)**
- Ensure the bold summary row also adapts to the mobile card layout

### 2. Schedule Confirmation -- No Code Changes Needed

The Schedule Installation section is already rendering correctly on mobile. The email template exists in `supabase/functions/send-install-confirmation/index.ts` and sends a branded HTML email with install date, time window, address, notes, and homeowner prep reminder. Since we cannot trigger a test email from here, no screenshot of the actual delivered email is available -- the email template was reviewed and is correct.

## Technical Details

The primary approach for the Estimate Summary is to make `SummaryRow` responsive:

```text
Mobile (<640px):
+---------------------------+
| Protection                |
| Retail: $X  | Floor: $X   |
| Quoted: $X  | Comm: $X    |
+---------------------------+

Desktop (>=640px):
| Section | Retail | Floor | Quoted | Commission |
```

For the data-entry grids (downspouts, elbows, add-ons), wrapping in `overflow-x: auto` is the pragmatic fix since these are input-heavy tables that benefit from horizontal scrolling rather than stacking.

## Files Modified

| File | Change |
|---|---|
| `src/components/NGRGutterCalculator.tsx` | Make SummaryRow responsive, add overflow containers to data grids, fix StatBar spacing |
