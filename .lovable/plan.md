

## Backfill Daily Canvasser Entries from Today's Saves

### Problem
The manager entered canvasser hours earlier today, but that happened before the code change that writes to `daily_canvasser_metric_entries` was deployed. The data exists in `weekly_canvasser_metrics` but the Hours Tracker reads from `daily_canvasser_metric_entries`, which is empty.

### Solution
Insert the missing daily entries directly into the database for the 3 canvassers who had hours saved today (Feb 17, 2026):

| User ID | Hours |
|---------|-------|
| 35458922-... (Blake/Gerard/etc) | 4 |
| 9bc0a97e-... | 5 |
| a466f804-... | 5 |

We will insert records into `daily_canvasser_metric_entries` with `entry_date = '2026-02-17'` for each of these users, pulling the hours from the `weekly_canvasser_metrics` data.

### Technical Details

**Database insert** (using the insert tool):
```sql
INSERT INTO daily_canvasser_metric_entries (user_id, entry_date, hours_worked_delta)
SELECT user_id, '2026-02-17', hours_worked
FROM weekly_canvasser_metrics
WHERE week_start = '2026-02-16' AND hours_worked > 0
ON CONFLICT (user_id, entry_date)
DO UPDATE SET hours_worked_delta = EXCLUDED.hours_worked_delta, updated_at = now();
```

This is a one-time backfill. Going forward, the code change from earlier will automatically write daily entries whenever the manager saves new data.

No code changes needed -- just the data insert.
