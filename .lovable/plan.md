

# Fix: Canvasser Count Includes Archived/Removed Users

## Problem

On the Admin Overview Canvassers tab, the "Total Canvassers" stat card (and all aggregate numbers) are computed from the **unfiltered** `canvassers` array (line 413-428), which includes archived users and users who no longer hold the canvasser role.

The filtered list (`activeCanvassers`) is computed on line 433 and used for the detail table — but the aggregates are set on line 432 **before** filtering. So the table shows the correct people, but the stat cards count too many.

## Fix

In `src/pages/dashboard/AdminOverview.tsx`, move the aggregate calculation to run **after** the active filter, so it only counts non-archived users who currently hold the canvasser role.

Specifically:
1. Move line 433 (`activeCanvassers` filter) to before the `canvasserTotals` reduce
2. Run the reduce over `activeCanvassers` instead of `canvassers`
3. Also compute `totalIncome` from the filtered list

This is a ~5 line reorder — no new logic, no schema changes.

