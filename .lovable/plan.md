

# Diagnosis: Why Canvass Leads Still Show 0

## What happened

The attribution sync code I added works — it correctly wrote `canvass_leads_delta: 2` for Andre and `canvass_leads_delta: 1` for Dru to `daily_user_metric_entries`. However, those entries are dated **2026-03-10** (the day the save was performed).

The Weekly Updates UI queries `daily_user_metric_entries` filtered by `entry_date = selectedDate`. Today is **2026-03-12**, so `loadSavedEntries()` finds no entries for today and shows all zeros. The "Lead Sources (2)" badge still shows because it queries `lead_attributions` by week, not by day.

This is actually the same behavior as all other fields — if you entered Approved Revenue on Monday, it wouldn't show on Wednesday either. But for attribution-synced fields, this is confusing because the admin expects the canvasser attribution to persist for the whole week.

## Fix

Modify `loadSavedEntries()` to pre-populate canvass fields from the **weekly aggregate** when no daily entry exists for the current date. This way, if Andre had 2 canvass leads attributed earlier in the week, his "Canvass Leads" column shows 2 even on a different day.

### Changes — `src/pages/admin/WeeklyUpdates.tsx`

1. **In `loadSavedEntries()`** — after querying `daily_user_metric_entries` for the selected date, also query `weekly_user_metrics` for the current week. For each sales rep that has NO daily entry for today but DOES have weekly canvass values, pre-fill `weeklyCanvassLeads` and `weeklyCanvassDealsClose` from the weekly row. Set those as read-only/dimmed to indicate they're inherited from earlier in the week.

2. **Baseline handling** — when pre-filling from weekly data (not daily), set the baseline for canvass fields to 0 so that any NEW entry today creates a fresh daily delta rather than trying to subtract from the weekly total.

3. **Backfill existing data** — the attributions created before the code change already have daily entries (from 2026-03-10). The weekly metrics also got updated. So no manual backfill is needed — the weekly query will pick them up.

### What this changes in practice

| Scenario | Before | After |
|----------|--------|-------|
| Admin attributes Blake's leads to Andre on Monday | Andre shows 2 on Monday only | Andre shows 2 all week |
| Admin enters additional canvass leads for Andre on Wednesday | Must remember Monday's total | Sees Monday's 2, can add on top |
| No attribution was made | Shows 0 | Shows 0 (unchanged) |

One file changed. No database changes needed.

