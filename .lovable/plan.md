

# Add Weekly, Monthly, and YTD Company-Wide Stats to the Report

## Problem

The scheduled report only queries YTD cumulative tables (`user_metrics`, `canvasser_metrics`). It needs to show company-wide **weekly**, **monthly**, and **yearly** numbers for: Revenue, Contracts (closed deals), Leads, Lead-to-Close Ratio, and Collections.

## Data Sources

| Period | Sales Table | Canvasser Table |
|---|---|---|
| Weekly | `weekly_user_metrics` where `week_start = current Monday` | `weekly_canvasser_metrics` where `week_start = current Monday` |
| Monthly | `weekly_user_metrics` where `week_start >= 1st of current month` (sum across weeks) | `weekly_canvasser_metrics` where `week_start >= 1st of current month` |
| YTD | `user_metrics` (existing logic) | `canvasser_metrics` (existing logic) |

## Changes to `supabase/functions/send-scheduled-report/index.ts`

### 1. Add a `CompanyPeriodStats` interface

Fields: `revenue`, `collections`, `contracts`, `leads`, `leadToCloseRate` -- one instance for each of weekly, monthly, and YTD.

### 2. Fetch Weekly Sales Data

Query `weekly_user_metrics` for `week_start = current Monday`. Sum `approved_revenue`, `collections`, `closed_deals`, and `leads` across all users to get company-wide weekly totals.

### 3. Fetch Monthly Sales Data

Query `weekly_user_metrics` where `week_start >= first day of current month`. Aggregate same fields across all rows.

### 4. Fetch Weekly Canvasser Data

Already partially fetched for hours. Extend to also sum `leads_set` and `leads_closed` for the weekly company totals.

### 5. Fetch Monthly Canvasser Data

Query `weekly_canvasser_metrics` where `week_start >= first day of current month`. Sum `leads_set` and `leads_closed`.

### 6. Calculate Lead-to-Close Ratio per Period

For each period: `(closedDeals / leads) * 100` using the sales rep leads and closed deals.

### 7. Update Email HTML Template

Add a new **"Company Performance Summary"** section near the top (after Goals Progress) with a 3-row table:

```
| Period    | Revenue   | Collections | Contracts | Leads | LtC %  |
|-----------|-----------|-------------|-----------|-------|--------|
| This Week | $X        | $X          | X         | X     | X.X%   |
| This Month| $X        | $X          | X         | X     | X.X%   |
| YTD       | $X        | $X          | X         | X     | X.X%   |
```

This gives a clear at-a-glance comparison across all three time periods. The existing Top Sales Reps and Top Canvassers tables will continue showing YTD rankings. The Canvasser Hours section remains as-is (weekly only).

### 8. Fix YTD Collections

Currently `totalCollections` is hardcoded to `0`. Will actually sum `collections` from `user_metrics` (the YTD table already has this column).

## Files Modified

| File | Change |
|---|---|
| `supabase/functions/send-scheduled-report/index.ts` | Add weekly/monthly data fetching, add CompanyPeriodStats, add company summary table to email HTML, fix collections |

