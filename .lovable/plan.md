
## Plan: Fix Monthly Canvasser Leaderboard - Filter Archived Users

### Problem Identified

The Admin Leaderboards page (`src/pages/admin/AdminLeaderboards.tsx`) is showing archived users on both the **weekly** and **monthly** canvasser leaderboards. Specifically:

- "Da Man" has `is_archived: true` in the profiles table
- But they're still appearing on the leaderboard because the admin leaderboards don't filter out archived users

The data values are correct (400 doors, 19 leads set, 12 w/ damage, 6 closed, 139 points match the database), but archived users should be hidden from active leaderboard views.

---

### Root Cause

The `CanvasserLeaderboard.tsx` page correctly fetches active profiles and filters out archived users, but `AdminLeaderboards.tsx` was never updated with the same filtering logic for canvasser data.

---

### Solution

Add archived user filtering to both the weekly and monthly canvasser fetch functions in `AdminLeaderboards.tsx`.

---

### Changes Required

#### File: `src/pages/admin/AdminLeaderboards.tsx`

**Part 1: Update Weekly Canvasser Fetch (lines 450-508)**

Add filtering for archived users at the start of the weekly canvasser fetch:

```typescript
if (timeFrame === 'weekly') {
  // ADD: Fetch active profiles to filter archived users
  const { data: activeProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_archived', false);
  
  const activeUserIds = new Set(activeProfiles?.map(p => p.id) || []);

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const { data: weeklyData } = await supabase
    .from('weekly_canvasser_metrics')
    .select('...')
    .eq('week_start', weekStartStr);

  // ...existing code...

  const sorted = weeklyData
    .filter(w => activeUserIds.has(w.user_id))  // ADD: Filter archived
    .map(w => ({...}))
    // ...rest of chain
```

**Part 2: Update Monthly Canvasser Fetch (lines 509-587)**

Add the same filtering for the monthly view:

```typescript
} else if (timeFrame === 'monthly') {
  // ADD: Fetch active profiles to filter archived users
  const { data: activeProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_archived', false);
  
  const activeUserIds = new Set(activeProfiles?.map(p => p.id) || []);

  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

  const { data: weeklyData } = await supabase
    .from('weekly_canvasser_metrics')
    .select('...')
    .gte('week_start', monthStartStr)
    .lte('week_start', monthEndStr);

  // ...existing code...

  // Update aggregation to filter archived users
  const aggregated = new Map<string, any>();
  weeklyData.forEach(w => {
    if (!activeUserIds.has(w.user_id)) return;  // ADD: Skip archived
    // ...rest of aggregation
  });
```

---

### Summary of Changes

| Location | Change |
|----------|--------|
| Weekly canvasser fetch (line ~453) | Add profile fetch and filter `activeUserIds` |
| Monthly canvasser fetch (line ~509) | Add profile fetch and filter `activeUserIds` in aggregation loop |

---

### Expected Result

After this fix:
- "Da Man" (archived user) will no longer appear on the monthly or weekly canvasser leaderboards in the admin view
- Only active, non-archived canvassers with metrics will be displayed
- The data accuracy remains the same - we're just filtering who is shown
