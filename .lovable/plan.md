

## Fix Archived/Removed Users Showing + Alphabetical Sorting

### Problem Summary
1. **Kara and Adam** were removed as canvassers but still appear in Weekly Updates and Master Overview canvasser sections because their `canvasser_metrics` rows still exist. The current code only checks archive status, not whether users still hold the canvasser role.
2. **Da Man** (deleted user) still appears in Master Overview despite having no profile -- need to ensure the active-set filtering also cross-references current roles.
3. Users are not sorted alphabetically in the Overview and User Roles pages.

---

### Fix 1: WeeklyUpdates.tsx -- Filter canvassers by current role

**Current behavior (line 157):** Only checks `archivedUserIds` when filtering canvasser_metrics.

**Fix:** Also check that the user currently has the `canvasser` role by cross-referencing the `canvasserUserIds` set (already built on line 99). Change the canvasser filter to:
```
if (item.user_id && !uniqueCanvassers.has(item.user_id) 
    && !archivedUserIds.has(item.user_id) 
    && canvasserUserIds.has(item.user_id))
```

This ensures only users who currently hold the canvasser role appear in the canvasser weekly updates section.

### Fix 2: AdminOverview.tsx -- Filter canvassers by current role

**Current behavior:** Queries all `canvasser_metrics` rows and only filters by active profile status. Users who no longer have the canvasser role (or have no profile at all) can slip through.

**Fix:** Fetch `user_roles` for canvasser users and build a set of current canvasser role holders. Add an additional filter so only users with an active canvasser role appear:
- Fetch roles for canvasser user IDs
- Build `currentCanvasserRoleIds` set from users who have role = 'canvasser'
- Filter: `c.realUserId && activeCanvasserIds.has(c.realUserId) && currentCanvasserRoleIds.has(c.realUserId)`

This handles both Da Man (no profile = not in active set) and Kara/Adam (no canvasser role = not in role set).

### Fix 3: Alphabetical Sorting

**UserRoles.tsx (lines 130-136):** Change sorting from "admins first, then alphabetical" to pure alphabetical:
```
combined.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
```

**AdminOverview.tsx (line 339):** Change sales reps sort from revenue-based to alphabetical:
```
activeSalesReps.sort((a, b) => a.name.localeCompare(b.name))
```

**AdminOverview.tsx (line 445):** Change canvassers sort from points-based to alphabetical:
```
activeCanvassers.sort((a, b) => a.name.localeCompare(b.name))
```

### Summary of Files

| File | Change |
|---|---|
| `src/pages/admin/WeeklyUpdates.tsx` | Add `canvasserUserIds.has()` check to canvasser filtering (line 157) |
| `src/pages/dashboard/AdminOverview.tsx` | Add current-role check for canvassers; sort both tables alphabetically |
| `src/pages/admin/UserRoles.tsx` | Sort users alphabetically instead of admins-first |

