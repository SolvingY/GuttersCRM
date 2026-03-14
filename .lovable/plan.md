

# Fix: Date Range Button Not Visible on Mobile

## Problem
The "Send Date Range Report" button exists in the code but on a 360px mobile screen, the three buttons in the `flex-wrap` container cause the third button to wrap to a new line where it's either cut off or hard to notice. The user scrolls past the card without seeing it.

## Solution
Move the "Send Date Range Report" button to its own row as a **full-width** button below the Save/Send Test buttons, making it unmissable on mobile. Apply this to both the Canvasser and Production EOD cards.

## Changes — `src/pages/admin/ReportSettings.tsx`

**Canvasser EOD card (lines 620-633):**
- Split the button group: keep "Save EOD Settings" and "Send Test Report" in the flex row
- Move "Send Date Range Report" to a separate full-width `w-full` button below them

**Production EOD card (similar pattern around line 755-761):**
- Same change: move the date range button to its own full-width row

## Files Changed
- `src/pages/admin/ReportSettings.tsx` — restructure button layout for mobile visibility

