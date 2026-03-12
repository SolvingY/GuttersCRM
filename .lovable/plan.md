

# Fix: Duplicate Attribution Double-Counting for Andre

## Problem

Andre shows 11 canvass leads, but his Lead Sources accordion shows only 3 (Blake=1, Sean=2). The `lead_attributions` table has **duplicate rows** from two sources:

1. **Dual entry types**: The same attribution is recorded as both `canvasser_lead_set` AND `rep_canvass_lead`, doubling the count
2. **Re-insertion on save**: Each "Save All" re-inserts attributions without deduplication, creating additional rows

The pre-fill code sums ALL of these, inflating the number.

## Fix — `src/pages/admin/WeeklyUpdates.tsx`

### Change 1: Deduplicate attribution types in pre-fill aggregation

When aggregating from `lead_attributions` for pre-fill, only count **one set** of entry types — use `canvasser_lead_set` / `canvasser_lead_closed` as the canonical types. Ignore `rep_canvass_lead` / `rep_canvass_contract` since they duplicate the same data:

```typescript
// Only aggregate canonical types to avoid double-counting
if (a.entry_type === 'canvasser_lead_set') t.canvassLeads += a.quantity;
else if (a.entry_type === 'canvasser_lead_closed') t.canvassDeals += a.quantity;
```

### Change 2: Same fix in `executeSave()` sync logic

Apply the same canonical-type-only filter in the post-save sync that writes to `user_metrics` / `daily_user_metric_entries` / `weekly_user_metrics`.

### Change 3: Prevent duplicate insertions

Before inserting new attribution rows, delete existing attributions for the same `week_start` + `canvasser_id` + `sales_rep_id` + `entry_type` combination, or use an upsert pattern. This prevents repeated saves from creating duplicate rows.

### Change 4: Clean up existing duplicates

Run a one-time cleanup to remove the `rep_canvass_lead` and `rep_canvass_contract` rows that duplicate `canvasser_lead_set` / `canvasser_lead_closed` rows, and correct Andre's `weekly_user_metrics.canvass_leads` to the true value (3).

## Expected Result

After fix: Andre's canvass leads = 3 (Blake 1 + Sean 2), matching the Lead Sources accordion.

## Files Changed
- `src/pages/admin/WeeklyUpdates.tsx` — three locations (pre-fill aggregation, save sync, insertion dedup)
- One database cleanup migration for existing duplicates

