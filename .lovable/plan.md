

# Hard Delete Leads with Full Data Cleanup

## Problem
When testing the system with demo leads, there's no way to permanently delete them. Leads can only be archived, but they persist in the database and pollute metrics, leaderboards, and reports.

## Approach
Add a "Permanently Delete" button on the Lead Detail page (admin only) that removes the lead and reverses any canvasser metric increments caused by its creation.

## Database

### Foreign key cascade status (already configured)
- `lead_activity_log`, `lead_files`, `lead_forms`, `lead_payments` → **ON DELETE CASCADE** (auto-deleted)
- `gutter_estimates`, `commercial_hail_assessments`, `production_checklist_submissions` → **ON DELETE SET NULL** (orphaned gracefully)

No schema migration needed for cascades — they're already correct.

### New database function: `hard_delete_lead`
Create a `SECURITY DEFINER` function that:
1. Looks up the lead's `canvasser_id` and `created_at` to determine if canvasser metrics need reversing
2. If the lead has a `canvasser_id` and `lead_source = 'canvasser'`:
   - Decrement `canvasser_metrics.leads_set` by 1 for that canvasser
   - Decrement `weekly_canvasser_metrics.leads_set` by 1 for the matching week
   - Decrement `daily_canvasser_metric_entries.leads_set_delta` by 1 for the matching day
3. Delete any files from storage (`lead-files` bucket) associated with `lead_files` rows for this lead
4. Delete the `quote_requests` row (cascades handle child tables)
5. Only callable by admins (check `has_role`)

## UI Changes

### `src/pages/admin/LeadDetail.tsx`
- Add a red "Permanently Delete" button in the header actions area (near Archive/Cancel)
- Show a confirmation dialog warning that this action is irreversible and will remove all associated data
- Require typing the lead's reference number to confirm (safety measure for production data)
- On confirm, call the `hard_delete_lead` RPC, then navigate back to `/admin/leads`
- Invalidate all relevant query caches

## Files Changed
- **Database migration** — create `hard_delete_lead(p_lead_id UUID)` function
- **`src/pages/admin/LeadDetail.tsx`** — add delete button, confirmation dialog, and mutation

