

## Fix Plan

Three changes across three files, plus an edge function redeploy.

---

### Fix 1 — Dual-role zone assignment modal (`AdminTimeClock.tsx`)

**`fetchAllTeamMembers` (lines 226-243)**: Remove the `seen` Set dedup. Create one entry per `(user_id, role)` pair instead of one per user. A dual-role user like Adam with `user` + `canvasser` roles appears twice in the list.

**New state**: `zoneRoleFilter` (default `'all'`) — a Select dropdown at the top of the zone assignment modal body with options: All Roles, Canvasser, Sales Rep, Supplementer, Production, Office.

**Zone assignment modal (lines 1060-1082)**:
- Add the role filter Select above the user list
- Filter `allTeamMembers` by `zoneRoleFilter` before rendering
- Each row still toggles `assignedCanvasserIds` by `member.userId` — the Set dedupes naturally if the same userId is checked under two roles
- Reset `zoneRoleFilter` to `'all'` in `handleOpenAssignZone` (line 494)
- Save logic (`handleSaveAssignments`) completely unchanged

---

### Fix 2 — Read-only Work Zones card (`MyStats.tsx` + `ProductionDashboard.tsx`)

**Both files**: Add inline state + fetch for work zones. On mount:
1. Fetch all active zones from `geofence_work_zones` where `is_active = true`
2. Fetch all assignments from `canvasser_zone_assignments`
3. Fetch user's own assignments where `canvasser_id = user.id`
4. Filter zones: include zones assigned to user OR global zones (those with zero assignments in the table)

**`MyStats.tsx`**: Add a Card after `RoleTimeClockWidget` (line 290). Title: "Your Work Zones" with MapPin icon. Each zone shows: name, radius in miles (radius_meters / 1609.34, 1 decimal), green "Active" badge. If no zones: "No specific zones assigned — all active zones apply to you."

**`ProductionDashboard.tsx`**: Same Card after `ProductionTimeClockWidget` (line 160). Identical display logic.

No map iframes. No edit controls. Display only.

---

### Fix 3 — Office role assignment edge function

The edge function code at lines 182-183 has a logic gap: when `admin + office` (no other operational roles), `isOfficeOnly` is false (because `hasAdminRole` is true), and the third condition is false (because `hasOfficeRole` is true). So it falls through to metrics creation — which is correct (no metrics to create, returns 200).

However, the edge function logs show only "booted" messages with no actual invocation records, suggesting the function may not have the latest code deployed. The fix is to redeploy the edge function to ensure the current code (which already handles admin+office correctly) is live.

Additionally, I'll add a dedicated `admin + office` early return condition at line 183 for clarity:
```
const isAdminWithOfficeOnly = hasAdminRole && hasOfficeRole && !hasSalesRole && !hasCanvasserRole && !hasSupplementerRole && !hasProductionRole;
```

---

### Files touched

| File | Change |
|------|--------|
| `src/pages/admin/AdminTimeClock.tsx` | Remove dedup in fetchAllTeamMembers, add zoneRoleFilter state + Select dropdown in zone modal |
| `src/pages/dashboard/MyStats.tsx` | Add read-only Work Zones card |
| `src/pages/production/ProductionDashboard.tsx` | Add read-only Work Zones card |
| `supabase/functions/admin-set-user-role/index.ts` | Add explicit admin+office early return, redeploy |

