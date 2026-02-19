
# Fix: My Estimates Table Not Accessible on Mobile

## Problem
The table has 5 columns (Date, Customer Name, Quoted Price, Commission, Actions) which overflow on mobile. The "Open & Edit" button in the Actions column is completely off-screen and unreachable.

## Solution
Replace the table layout with a **card-based layout on mobile** and keep the table on desktop. Each card will show the estimate details stacked vertically with the "Open & Edit" button fully visible and tappable.

## File Modified

**`src/pages/dashboard/MyEstimates.tsx`**

Replace the `<table>` block (lines 52-85) with a responsive layout:

- **Mobile (below `sm` breakpoint):** Render each estimate as a card with:
  - Date and Customer Name on top
  - Quoted Price and Commission side by side
  - Full-width "Open & Edit" button at the bottom of each card
- **Desktop (`sm` and above):** Keep the existing table layout but wrap it in `overflow-x-auto` as a safety net

Implementation uses Tailwind's `hidden sm:block` and `sm:hidden` classes to swap between card view and table view -- no JavaScript breakpoint detection needed.
