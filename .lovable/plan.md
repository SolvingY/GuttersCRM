

# Fix: Dru's Canvass Metrics Not Populating

## Root Cause (confirmed via DB queries)

Two bugs are causing Dru's canvass fields to show 0:

1. **Missing entry type in sync code**: The attribution sync (line 871) only processes `canvasser_lead_set` and `canvasser_lead_closed`, but the Attribution Modal also produces `rep_canvass_lead` and `rep_canvass_contract` entry types. Dru has `rep_canvass_lead` attributions that are being ignored.

2. **Historical data gap**: Dru's `weekly_user_metrics.canvass_leads = 0` because most attributions were created before the sync code existed. The weekly pre-fill fallback correctly reads from `weekly_user_metrics`, but finds 0.

## DB State (verified)

| Rep | `weekly_user_metrics.canvass_leads` | `daily.canvass_leads_delta` | Attributions (total) |
|-----|-----|-----|-----|
| Andre | 1 | — | ~5 `canvasser_lead_set` + 2 `rep_canvass_lead` |
| Dru | **0** | 1 (on 03-10 only) | ~6 `canvasser_lead_set` + 1 `rep_canvass_lead` |

## Fix — Two Changes

### 1. Code: Include all attribution types in sync (`WeeklyUpdates.tsx`)

Update the sync filter (line 871) to also process `rep_canvass_lead` and `rep_canvass_contract` entry types:

```typescript
if (a.entry_type === 'canvasser_lead_set' || a.entry_type === 'rep_canvass_lead') {
  repDeltas[a.sales_rep_id].canvassLeads += a.quantity;
} else if (a.entry_type === 'canvasser_lead_closed' || a.entry_type === 'rep_canvass_contract') {
  repDeltas[a.sales_rep_id].canvassDeals += a.quantity;
}
```

### 2. Code: Derive canvass totals from `lead_attributions` instead of relying on `weekly_user_metrics`

In `loadSavedEntries()`, instead of (or in addition to) reading from `weekly_user_metrics` for the canvass fallback, query `lead_attributions` directly to get the **true** attributed totals for each rep for the current week. This makes the pre-fill resilient to historical gaps:

```sql
SELECT sales_rep_id, 
  SUM(CASE WHEN entry_type IN ('canvasser_lead_set','rep_canvass_lead') THEN quantity ELSE 0 END) as canvass_leads,
  SUM(CASE WHEN entry_type IN ('canvasser_lead_closed','rep_canvass_contract') THEN quantity ELSE 0 END) as canvass_deals
FROM lead_attributions 
WHERE week_start = :weekStart
GROUP BY sales_rep_id
```

Use these totals to pre-fill `weeklyCanvassLeads` and `weeklyCanvassDealsClose` when no daily entry exists for the selected date.

### 3. Backfill: Sync Dru's existing data

After fixing the code, also update Dru's `weekly_user_metrics` to reflect the current attribution count. This can be done by the code itself on next load (since we're reading from `lead_attributions` directly), so no manual SQL patch is needed.

## Files Changed
- `src/pages/admin/WeeklyUpdates.tsx` — two locations:
  1. Attribution sync in `executeSave()`: add `rep_canvass_lead` / `rep_canvass_contract` types
  2. `loadSavedEntries()`: query `lead_attributions` for canvass pre-fill instead of `weekly_user_metrics`

