

# Auto-Track Canvasser Leads Set on Lead Creation and Archive

## Overview

When a canvasser submits a lead, their "Leads Set" metric should automatically increment across all three tracking levels (YTD, weekly, daily). When a lead is archived (e.g., fake lead), those metrics should be rolled back. This ensures the Canvasser Performance leaderboard stays accurate without requiring manual admin data entry.

---

## Change 1: Increment Canvasser Metrics on Lead Creation

**File:** `src/pages/canvasser/CreateCanvasserLead.tsx`

After successfully inserting the lead into `quote_requests`, add three metric updates:

1. **YTD (canvasser_metrics):** Increment `leads_set` by 1 for the canvasser's user ID
2. **Weekly (weekly_canvasser_metrics):** Upsert a record for the current week, incrementing `leads_set` by 1. Recalculate `points_earned` using the standard formula (closed x 10 + damage x 5 + set x 1)
3. **Daily (daily_canvasser_metric_entries):** Upsert a record for today's date with `leads_set_delta` incremented by 1. Uses the existing unique constraint on `(user_id, entry_date)` to add to any existing entry for that day

This happens client-side after lead insertion, using the same compounding pattern as the WeeklyUpdates admin page.

---

## Change 2: Decrement Canvasser Metrics on Archive

**File:** Database migration (update `archive_lead` function)

Add a new block to the existing `archive_lead` function that checks if the archived lead has a `canvasser_id`. If so:

1. Decrement `canvasser_metrics.leads_set` by 1 (floored at 0)
2. Recalculate `canvasser_metrics.points` using the standard formula
3. Find the weekly record matching the lead's `created_at` date and decrement `leads_set` there too
4. Find the daily entry matching the lead's `created_at` date and decrement `leads_set_delta` there too

This ensures that when a fake lead is archived, the canvasser's metrics are fully rolled back across all timeframes.

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/canvasser/CreateCanvasserLead.tsx` | After lead insert, increment canvasser_metrics.leads_set, upsert weekly and daily entries |
| Database migration | Update `archive_lead` function to decrement canvasser metrics when canvasser_id is present |

### Week Calculation Logic

The weekly bucket uses Monday-Sunday weeks, matching the existing pattern:
- `week_start` = Monday of the lead creation date
- `week_end` = Sunday of that week

### Points Recalculation

Canvasser points formula (already established): `(leads_closed * 10) + (leads_with_damage * 5) + (leads_set * 1)`

After incrementing/decrementing `leads_set`, the points column is recalculated accordingly.

### Daily Entry Upsert

Uses `ON CONFLICT (user_id, entry_date)` to handle the case where the canvasser already has a daily entry for that date (e.g., admin entered other metrics). In that case, `leads_set_delta` is added to the existing value rather than overwritten.

### RLS Consideration

The canvasser only has SELECT on `daily_canvasser_metric_entries` and `weekly_canvasser_metrics`. The increment logic will use a new database function `increment_canvasser_lead_set` that runs as `SECURITY DEFINER` to bypass RLS, similar to how `create_manual_lead` works. This function handles all three metric levels atomically.

