

# Fix: Standardize YTD Canvasser Data Sources + Negative Numbers

## Problem Summary

Three places show YTD canvasser metrics using **different data sources**, producing inconsistent numbers:

| Location | Current Source | Numbers |
|----------|---------------|---------|
| Admin Overview (Canvasser section) | `daily_canvasser_metric_entries` | Leads Set: 54, Leads Closed: 9 |
| Company Goals (Contract Progress) | `canvasser_metrics` (cumulative) | Leads Set: 117, Contracts: 12 |
| Admin Leaderboard > YTD > Canvassers | `canvasser_metrics` (cumulative) | Shows negative values |

The daily entries table is the source of truth. The cumulative `canvasser_metrics` table has drifted and contains stale/incorrect data.

## Fix

### 1. Admin Leaderboard YTD — switch to daily entries
**File:** `src/pages/admin/AdminLeaderboards.tsx` (lines 413-508)

Replace the `fetchCanvasserYtd` function to use `fetchCanvasserLeaderboardByDateRange` (same function used for weekly/monthly) with the fiscal year date range. This automatically includes clamping, hidden user filtering, and computed points.

The existing function reads from `canvasser_metrics` — replace it with:
```typescript
const fetchCanvasserYtd = async () => {
  setCanvasserLoading(true);
  const startDate = format(FISCAL_YEAR.CURRENT_YEAR_START, 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');
  const entries = await fetchCanvasserLeaderboardByDateRange(startDate, endDate);
  setCanvasserYtdEntries(entries);
  setCanvasserLoading(false);
};
```

This is exactly what the Canvasser Leaderboard page already does (line 56-59 of `CanvasserLeaderboard.tsx`).

### 2. Company Goals — switch to daily entries
**File:** `src/pages/admin/CompanyGoals.tsx` (lines 233-256)

Replace the canvasser data fetching block that reads from `canvasser_metrics` with aggregation from `daily_canvasser_metric_entries` for the fiscal year. Aggregate `leads_set_delta`, `leads_closed_delta`, and `income_delta` per user, clamp to >= 0, then compute totals.

### 3. Add contest/wager points to `fetchCanvasserLeaderboardByDateRange`
**File:** `src/lib/fetchCanvasserLeaderboardData.ts`

The shared fetch function currently computes points only from performance fields. Add `contest_points` and `wager_points` from `canvasser_metrics` to the point total, matching what the previous YTD code did.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminLeaderboards.tsx` | Replace `fetchCanvasserYtd` to use `fetchCanvasserLeaderboardByDateRange` |
| `src/pages/admin/CompanyGoals.tsx` | Replace canvasser data fetch with daily entries aggregation |
| `src/lib/fetchCanvasserLeaderboardData.ts` | Include contest/wager points from canvasser_metrics in total |

No database changes needed.

