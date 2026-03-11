

# Fix Plan: Propagation, Display Names, and Contracts Column

## Four Issues

### Issue 1: Sales rep daily entries silently failing
The `daily_user_metric_entries` table is missing a unique constraint on `(user_id, entry_date)`. The code uses `onConflict: 'user_id,entry_date'` for upserts, which silently fails without this constraint.

**Fix:** Add the missing unique constraint via migration.

### Issue 2: Realtime subscriptions not firing for filtered queries
`CanvasserStats.tsx` uses a `filter: user_id=eq.${user.id}`, but `canvasser_metrics` uses default replica identity (primary key only). Supabase cannot match the filter against `user_id`.

**Fix:** Set `REPLICA IDENTITY FULL` on `canvasser_metrics` and `user_metrics`.

### Issue 3: Display names not updating across the system
When a name is changed in User Roles (via `EditUserRoleModal`), it updates `profiles.full_name` only. But `user_metrics.display_name`, `canvasser_metrics.display_name`, and `supplementer_metrics.display_name` are never synced. Weekly Updates reads from those metrics tables, so it shows stale names.

**Fix (two-pronged):**
1. **`EditUserRoleModal.tsx`**: After updating `profiles.full_name`, also update `display_name` in `user_metrics`, `canvasser_metrics`, and `supplementer_metrics` for that user (where rows exist).
2. **`WeeklyUpdates.tsx`**: As a safety net, after fetching metrics data, also fetch `profiles` and prefer `profiles.full_name` over the metrics `display_name`.

### Issue 4: "Contracts" column on canvasser leaderboard
Canvassers don't track contracts — they track "Leads Closed". Remove the "Contracts" column.

**Fix:** Remove from `WeeklyCanvasserLeaderboardTable.tsx`, `fetchCanvasserLeaderboardData.ts`, and `ScoreboardCanvasserLeaderboard.tsx`.

## Changes

### Migration (database)
```sql
ALTER TABLE public.daily_user_metric_entries
  ADD CONSTRAINT daily_user_metric_entries_user_date_unique UNIQUE (user_id, entry_date);

ALTER TABLE public.canvasser_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.user_metrics REPLICA IDENTITY FULL;
```

### `src/components/admin/EditUserRoleModal.tsx`
- After updating `profiles.full_name`, add three update calls to sync `display_name` in `user_metrics`, `canvasser_metrics`, and `supplementer_metrics` for the target user.

### `src/pages/admin/WeeklyUpdates.tsx`
- In `fetchUsers`, also fetch `profiles` (id, full_name) and use `profiles.full_name` as the display name, falling back to the metrics table `display_name`.

### `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx`
- Remove "Contracts" column header, data cell, and totals row entry.

### `src/lib/fetchCanvasserLeaderboardData.ts`
- Remove `contracts` from aggregation and output mapping.

### `src/components/dashboard/ScoreboardCanvasserLeaderboard.tsx`
- Remove contracts mapping from `ytdEntries`.

