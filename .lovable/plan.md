

# Auto-Populate Sales Rep Canvass Metrics from Canvasser Attributions

## Problem

When an admin enters canvasser "Leads Set" (e.g., 7 for Landon Eastep) and attributes them to sales reps (e.g., 3 to Andre Runnells, 1 to Dru Dawson) via the Attribution Modal, the system only writes rows to `lead_attributions`. It does **not** increment the sales rep's `canvass_leads` or `canvass_deals_closed` columns. So Andre's "Canvass Leads" column stays at 0, and the admin has to manually type the number — causing double-counting.

The same applies for `canvasser_lead_closed` → should auto-increment the rep's `canvass_deals_closed`.

## Root Cause

In `executeSave()` (line 836-851), attribution rows are inserted into `lead_attributions`, but no code aggregates canvasser-tab attributions by `sales_rep_id` and writes the totals to the rep's metrics.

## Fix — Single File Change

### `src/pages/admin/WeeklyUpdates.tsx`

After the attribution insert block (line 851), add logic to:

1. **Filter canvasser-tab attributions** — only `canvasser_lead_set` and `canvasser_lead_closed` entry types (these are the ones from the canvasser tab that name a sales rep).

2. **Aggregate by `sales_rep_id`** — sum `quantity` per rep for each type:
   - `canvasser_lead_set` quantity → `canvass_leads` delta
   - `canvasser_lead_closed` quantity → `canvass_deals_closed` delta

3. **For each affected sales rep**, update three tables:
   - `user_metrics`: increment `canvass_leads` and `canvass_deals_closed`
   - `daily_user_metric_entries`: upsert, adding to `canvass_leads_delta` and `canvass_deals_closed_delta`
   - `weekly_user_metrics`: upsert, adding to `canvass_leads` and `canvass_deals_closed`

4. **Update baselines** — the existing `loadSavedEntries()` call after save already re-reads from the DB, so the sales rep fields will show pre-populated values on the next view.

### What stays the same
- The sales rep's own manual entry fields still work (they can still type values directly)
- Points are unaffected (canvass metrics don't factor into the sales points formula)
- The canvasser-side save is unchanged
- The `lead_attributions` table continues to store the detailed breakdown for close-rate analytics

### No database changes needed

