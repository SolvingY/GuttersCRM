

# Fix: Key Metrics & Conversion Funnel Still Reading from `canvasser_metrics` (Cumulative Table)

## Problem

Both **CanvasserStats** (individual) and **AdminOverview** (team aggregate) read Key Metrics and Conversion Funnel data from `canvasser_metrics` — the same cumulative table that has the stale-delta bug. The leaderboards were already fixed to aggregate from `daily_canvasser_metric_entries`, but these two areas were not updated.

Specifically:
- **CanvasserStats** (`fetchMetrics`, line 89): queries `canvasser_metrics` for one user → feeds Key Metrics cards + Conversion Funnel
- **AdminOverview** (`fetchAdminData`, line 195): queries `canvasser_metrics` for all users → feeds aggregate stats cards + Team Conversion Funnel

## Fix

Switch both pages to aggregate from `daily_canvasser_metric_entries` (fiscal year start → today), matching the leaderboard source.

### File 1: `src/pages/canvasser/CanvasserStats.tsx`

In `fetchMetrics()`, replace the `canvasser_metrics` query with:
1. Query `daily_canvasser_metric_entries` for this user, `entry_date >= FISCAL_YEAR.CURRENT_YEAR_START`
2. Sum all delta columns (`leads_set_delta`, `leads_closed_delta`, `doors_knocked_delta`, etc.)
3. Still read `display_name`, `yearly_goal`, `leads_set_goal`, `income_goal` from `canvasser_metrics` (these are config fields, not performance data)
4. Build the `metrics` object from the summed daily deltas + config fields
5. Import `FISCAL_YEAR` from constants

This ensures Key Metrics cards and the Conversion Funnel use the same source as the leaderboard.

### File 2: `src/pages/dashboard/AdminOverview.tsx`

In `fetchAdminData()`, replace the `canvasser_metrics` query (line 195) with:
1. Query `daily_canvasser_metric_entries` for all users, `entry_date >= FISCAL_YEAR.CURRENT_YEAR_START`
2. Group by `user_id`, sum all delta columns
3. Still read `display_name`, `yearly_goal`, `income` from `canvasser_metrics` for config/display fields
4. Build `canvasserDetails` and `canvasserAggregates` from the summed daily deltas

### What stays the same
- `canvasser_metrics` continues to store config fields (display_name, yearly_goal, canvasser_rank, income, etc.)
- Weekly Updates autosave + Save All logic unchanged
- Leaderboard logic unchanged
- Conversion Funnel component unchanged — only the data source feeding it changes

### Files touched
| File | Change |
|------|--------|
| `src/pages/canvasser/CanvasserStats.tsx` | Aggregate Key Metrics + Funnel from daily entries |
| `src/pages/dashboard/AdminOverview.tsx` | Aggregate canvasser stats + Funnel from daily entries |

