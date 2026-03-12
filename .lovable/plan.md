

# Fix: Backfill Missing Historical Data into Daily Entries

## What Happened

The daily entries system (`daily_canvasser_metric_entries`) started recording on **Feb 13, 2026**. But the fiscal year started **Dec 15, 2025**. Any canvasser activity between Dec 15 and Feb 12 was only tracked in the cumulative `canvasser_metrics` table — it was never written to daily entries.

When we switched all dashboards to aggregate from daily entries, we lost that historical data. Here's Devenae as an example:

| Metric | Cumulative (correct) | Daily Entries (incomplete) | Gap |
|--------|-----|-----|-----|
| Doors | 1,128 | 810 | 318 |
| Leads Set | 23 | 15 | 8 |
| Leads Closed | 7 | 5 | 2 |
| Leads w/ Damage | 10 | 5 | 5 |
| **Points** | **143** | **90** | **53** |

This affects nearly every canvasser — not just Devenae.

## Fix: One-Time Backfill Migration

Run a database migration that, for each canvasser, inserts a single "backfill" daily entry dated **Dec 15, 2025** (fiscal year start) containing the gap: `cumulative_value - SUM(daily_deltas)`.

This is a data-only fix. No code changes needed — once the backfill entries exist, all the daily-aggregation logic we already built will produce the correct numbers.

### Migration SQL (conceptual)

```sql
INSERT INTO daily_canvasser_metric_entries (user_id, entry_date, leads_set_delta, leads_closed_delta, leads_with_damage_delta, doors_knocked_delta, ...)
SELECT
  cm.user_id,
  '2025-12-15'::date,
  GREATEST(0, cm.leads_set - COALESCE(d.sum_leads_set, 0)),
  GREATEST(0, cm.leads_closed - COALESCE(d.sum_leads_closed, 0)),
  GREATEST(0, cm.leads_with_damage - COALESCE(d.sum_leads_with_damage, 0)),
  GREATEST(0, cm.doors_knocked - COALESCE(d.sum_doors, 0)),
  ...
FROM canvasser_metrics cm
LEFT JOIN (aggregate daily sums per user) d ON d.user_id = cm.user_id
WHERE gap > 0 for any metric;
```

The backfill includes all metric columns: `leads_set`, `leads_closed`, `leads_with_damage`, `leads_without_damage`, `conversations_had`, `not_interested`, `doors_knocked`, `hours_worked`, `income`, and `cancelled_leads`.

### What This Achieves

- Daily aggregation will now match the cumulative totals exactly
- No code changes required — all views already aggregate from daily entries
- Points will compute correctly since the underlying metrics are restored
- Future data continues flowing through daily entries as normal

## Files Changed

| File | Change |
|------|--------|
| Database migration only | Backfill gap entries into `daily_canvasser_metric_entries` |

No frontend code changes.

