

# Fix: Name Display & Alphabetical Sorting Across Dashboard

## Problem

1. **Stale names**: When names are updated in User Roles (which updates `profiles.full_name` and syncs to metrics tables), the dashboard still shows old names because the name resolution logic prioritizes `display_name` from metrics tables. If the sync partially fails or metrics have multiple rows, stale names persist.

2. **Missing sync for production_metrics**: The `EditUserRoleModal` syncs `display_name` to `user_metrics`, `canvasser_metrics`, and `supplementer_metrics` but **not** `production_metrics`.

3. **Alphabetical sorting**: The Sales Reps detailed stats section is already sorted alphabetically. Canvassers and Supplementers sections need the same sorting applied.

## Fix

### Change 1: `src/components/admin/EditUserRoleModal.tsx`
Add `production_metrics` to the name sync in the save handler (line ~102):
```typescript
supabase.from('production_metrics').update({ display_name: nameToSync }).eq('user_id', user.id),
```

### Change 2: `src/pages/dashboard/AdminOverview.tsx`
Flip the name resolution priority in all three sections to prefer `profiles.full_name` over `display_name`:

**Sales Reps** (line ~356):
```
name: (data.realUserId ? profilesMap.get(data.realUserId) : null) || data.displayName || 'Unknown User',
```

**Canvassers** (line ~438):
```
name: canvasserProfilesMap.get(userId) || config?.displayName || 'Unknown Canvasser',
```

**Production** (line ~551):
```
name: prodProfileMap.get(userId) || m?.display_name || 'Unknown',
```

**Canvasser sorting** — add `.sort((a, b) => a.name.localeCompare(b.name))` after the canvassers array is built (around line ~446, before setting state).

### Change 3: `src/components/dashboard/ScoreboardSalesLeaderboard.tsx`
Flip name priority (line ~122):
```
name: String(profilesMap.get(userId) || ytd.display_name || 'Unknown User'),
```

### Change 4: Other pages using stale `display_name`
Apply the same fix to:
- `src/pages/admin/CompanyGoals.tsx` — use profiles lookup instead of metrics `display_name`
- `src/pages/supplementer/SupplementerLeaderboard.tsx` — use profiles lookup
- `src/pages/admin/AdminTimeClock.tsx` — already falls back correctly (profileMap)

## Files Changed
- `src/components/admin/EditUserRoleModal.tsx` — add production_metrics sync
- `src/pages/dashboard/AdminOverview.tsx` — flip name priority, add canvasser sorting
- `src/components/dashboard/ScoreboardSalesLeaderboard.tsx` — flip name priority
- `src/pages/admin/CompanyGoals.tsx` — flip name priority
- `src/pages/supplementer/SupplementerLeaderboard.tsx` — flip name priority

