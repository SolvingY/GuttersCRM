

# Fix: Canvasser "Paid" / Income Not Displaying Correctly

## Root Cause

The `AdminOverview.tsx` canvasser table still reads income from the cumulative `canvasser_metrics.income` column (line 375, 417), which is stale and out of sync with actual daily entries. This is the same data-source inconsistency we just fixed for Company Goals and Leaderboards.

**Evidence from database:**
| Canvasser | `canvasser_metrics.income` (stale) | `daily_entries` income (truth) |
|-----------|--------------------------------------|-------------------------------|
| The Fieldmaster | $13,710 | $0 |
| David Olson | $7,625 | $0 |
| Sean Arvelo | $4,792 | $4,351 |
| Kam Awasthi | $4,770 | $0 |

The cumulative table has carried forward historical data that doesn't match the daily entries.

## Fix

### File: `src/pages/dashboard/AdminOverview.tsx`

**Change:** Instead of reading `income` from `canvasser_metrics` (config), compute it from the daily entries aggregation (`dailySumsByUser`) — the same source already used for leads, hours, and other metrics.

1. **Add `income` to the daily sums aggregation** (around lines 220-260 where `dailySumsByUser` is built). Include `income_delta` in the select and sum it alongside other fields.

2. **Use daily income instead of config income** on line 417:
   ```typescript
   // Before:
   income: config?.income || 0,
   // After:
   income: Math.max(0, perf.income || 0),
   ```

This ensures the "YTD Income" column in the canvasser performance table and the `totalCanvasserIncome` state (used in reports) both read from daily entries — consistent with Company Goals and Leaderboards.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/dashboard/AdminOverview.tsx` | Switch canvasser income from cumulative table to daily entries aggregation |

No database changes needed.

