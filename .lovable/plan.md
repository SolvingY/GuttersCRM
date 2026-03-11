

# Fix Canvasser EOD Report — Query Bug + Activity Display

## Root Cause Found

The 9 PM report showed **0 canvassers** because of a query bug on line 37 of the edge function:

```
select("id, display_name, full_name, is_archived")
```

The `profiles` table has **no `display_name` column** — that column only exists on `canvasser_metrics`. This causes the query to fail silently, returning no profiles, which means `canvasserIds` is empty and no canvasser data is fetched at all.

## Fix

**File:** `supabase/functions/send-canvasser-eod-report/index.ts`

1. **Remove `display_name` from profiles query** — change to `select("id, full_name, is_archived")`. Names are already resolved from `canvasser_metrics.display_name` on line 74.

2. **Keep current activity logic** — canvassers appear if they have a shift OR daily metric entries for the day. Their total hours and all numbers (doors, convos, leads, closed, contracts) from `daily_canvasser_metric_entries` are displayed. If admin removed hours (shift hours = 0), canvasser is correctly excluded.

This is a one-line fix that resolves the entire issue.

