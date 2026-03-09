

# Fix: Canvasser Hours Not Recording + Backfill

## Root Cause
RLS policies on `daily_canvasser_metric_entries` and `weekly_canvasser_metrics` only grant write access to admins. The `canvasser_metrics` table has a narrow update policy limited to `display_name`. When canvassers clock out, `updateCanvasserHours()` runs in their browser session and silently fails on all three tables.

## Affected Shifts Today (2026-03-09)
- **Sean Arvelo** — completed shift: 1.38h (clock-out at 18:58), currently clocked in again
- **Devanae** — completed shift: 0.02h (clock-out at 17:36), currently clocked in again
- Neither has any `daily_canvasser_metric_entries` or `weekly_canvasser_metrics` rows for today

## Fix 1 — Database Migration (RLS Policies)

Add INSERT + UPDATE policies so canvassers can write their own rows:

```sql
-- daily_canvasser_metric_entries
CREATE POLICY "Canvassers insert own daily entries"
  ON daily_canvasser_metric_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Canvassers update own daily entries"
  ON daily_canvasser_metric_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- weekly_canvasser_metrics
CREATE POLICY "Canvassers insert own weekly metrics"
  ON weekly_canvasser_metrics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Canvassers update own weekly metrics"
  ON weekly_canvasser_metrics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- canvasser_metrics: drop narrow policy, add full update
DROP POLICY "Canvassers can update their own display_name" ON canvasser_metrics;

CREATE POLICY "Canvassers update own metrics"
  ON canvasser_metrics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);
```

## Fix 2 — Backfill Sean & Devanae's Completed Shifts

Use the data insert tool to write the missing metric entries for their completed shifts today. This covers all three tiers (daily, weekly, YTD) so their tracker shows the correct hours immediately — they won't need to re-clock.

- **Sean**: +1.38h to daily (2026-03-09), weekly (current week), and YTD
- **Devanae**: +0.02h (round up to 0.25h per the quarter-hour logic in the code) to all three tiers

## No Code Changes Needed
The `updateCanvasserHours` utility and `TimeClockWidget` are correct — they just need the database to stop blocking writes.

## Files Changed
| Target | Change |
|--------|--------|
| Migration SQL | 5 new RLS policies + drop 1 old narrow policy |
| Data insert | Backfill 3-tier metrics for Sean and Devanae |

