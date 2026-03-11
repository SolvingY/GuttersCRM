

# Canvasser Leaderboard Fix — Implementation Plan

## Summary
Change canvasser leaderboard queries from `weekly_canvasser_metrics` to `daily_canvasser_metric_entries`, SUMming all 11 confirmed `_delta` columns by date range. Remove the TIER 2 write from the clock-out path.

## Changes

### 1. `src/lib/updateCanvasserHours.ts`
Remove the entire TIER 2 block (lines 61–93) that writes to `weekly_canvasser_metrics`. Keep TIER 1 (daily entries) and TIER 3 (YTD) unchanged.

### 2. `supabase/functions/auto-clockout-9pm/index.ts`
Remove the TIER 2 block that writes to `weekly_canvasser_metrics`.

### 3. `src/pages/admin/AdminLeaderboards.tsx`
Replace the canvasser weekly/monthly query against `weekly_canvasser_metrics` with:
- Query `daily_canvasser_metric_entries` WHERE `entry_date` BETWEEN Monday–Sunday (weekly) or month start–end (monthly)
- SUM all 11 `_delta` columns per `user_id`
- Join with `canvasser_metrics` for `display_name` and `canvasser_rank`
- Filter out archived/hidden users via `profiles`
- Full outer join logic: canvassers with daily entries but no weekly updates still appear (supplemental fields default to 0)

### 4. `src/components/dashboard/ScoreboardCanvasserLeaderboard.tsx`
Same query change as #3 — replace `weekly_canvasser_metrics` with `daily_canvasser_metric_entries` aggregation.

### 5. `src/pages/canvasser/CanvasserLeaderboard.tsx`
Same query change as #3 and #4.

## What stays unchanged
- `weekly_canvasser_metrics` table — no migration, no data changes
- Weekly Updates write path (continues writing to both `daily_canvasser_metric_entries` AND `weekly_canvasser_metrics`)
- AdminTimeClock manual shift operations
- `CanvasserStats.tsx`, `PitManagement.tsx` (they query `weekly_canvasser_metrics` for their own purposes)
- YTD (TIER 3) and daily (TIER 1) writes from clock-out remain

