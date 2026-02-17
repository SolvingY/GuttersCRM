

## Fix: Canvasser Hours Not Displaying in Hours Tracker

### Root Cause

The `daily_canvasser_metric_entries` table has a regular (non-unique) index on `(user_id, entry_date)`, but the code uses `onConflict: 'user_id,entry_date'` in the upsert call. PostgreSQL requires a **unique constraint** for upsert conflict resolution to work. Without it, the upsert silently fails, resulting in zero rows being written to the table. This is why the Hours Tracker always shows dashes.

### Fix

#### 1. Database Migration: Add unique constraint

Add a unique constraint on `(user_id, entry_date)` to the `daily_canvasser_metric_entries` table. This allows the upsert's `onConflict` clause to function correctly.

```sql
ALTER TABLE public.daily_canvasser_metric_entries
  ADD CONSTRAINT daily_canvasser_metric_entries_user_date_unique
  UNIQUE (user_id, entry_date);
```

#### 2. Code Fix: Add error logging (WeeklyUpdates.tsx)

Capture and log the upsert result so errors are not silently swallowed. This helps with future debugging.

```typescript
const { error: dailyError } = await supabase
  .from('daily_canvasser_metric_entries')
  .upsert({...}, { onConflict: 'user_id,entry_date' });

if (dailyError) {
  console.error('Error saving daily canvasser entry:', dailyError);
}
```

### Summary

| Change | Details |
|---|---|
| Database migration | Add unique constraint on `(user_id, entry_date)` |
| `src/pages/admin/WeeklyUpdates.tsx` | Add error handling for the daily entries upsert |

After this fix, when a manager saves canvasser data on the Weekly Updates page, the hours will be written to the database and immediately appear in the Hours Tracker on the Admin Overview.

