
## Fix "Da Man" on Leaderboards, Add Canvasser Hours Tracker, Fix Report Export

### Problem Summary
1. "Da Man" (deleted user with no profile) still appears on the Canvasser YTD Leaderboard because the filter only checks archived/hidden profiles -- users with no profile at all slip through.
2. No way to track canvasser daily hours by week in the Master Overview.
3. Report export is missing the `doorsKnocked` field for canvassers.

---

### Fix 1: AdminLeaderboards.tsx -- Filter deleted users from Canvasser YTD

**File:** `src/pages/admin/AdminLeaderboards.tsx`

In the `fetchCanvasserYtd` function (around line 399-436):
- After building `hiddenUserIds`, also query `user_roles` for users with `role = 'canvasser'` and build a `currentCanvasserRoleIds` set
- Change the filter at line 436 from `!hiddenUserIds.has(entry.user_id)` to also require `currentCanvasserRoleIds.has(entry.user_id)`

This ensures "Da Man" (no role entry since deleted) is excluded.

### Fix 2: AdminOverview.tsx -- Canvasser Hours Tracker

**File:** `src/pages/dashboard/AdminOverview.tsx`

**New state** (after line 134):
- `selectedHoursWeek`: Date initialized to current week's Monday
- `canvasserHoursData`: Array of daily entries

**New useEffect** (after line 458):
- Fetches `daily_canvasser_metric_entries` for the selected week range using `hours_worked_delta`
- Re-fetches when `selectedHoursWeek` changes

**New UI section** (after the Canvasser Performance table, before `</TabsContent>`):
- Card titled "Canvasser Hours Tracker"
- Week navigation with Previous/Next buttons and date range display
- Table with columns: Name, Mon, Tue, Wed, Thu, Fri, Sat, Sun, Total
- Each active canvasser as a row showing daily hours from `canvasserHoursData`
- Hours display as decimal (e.g., 8.0) or "-" if zero
- Weekly total column sums all 7 days

### Fix 3: AdminOverview.tsx -- Report Export

**File:** `src/pages/dashboard/AdminOverview.tsx` (around line 594-604)

Add `doorsKnocked: c.doorsKnocked` to the canvasser export data mapping. The `CanvasserData` interface in `reportGenerator.ts` already supports this as an optional field.

### Summary of Changes

| File | Change |
|---|---|
| `src/pages/admin/AdminLeaderboards.tsx` | Add canvasser role check to YTD fetch to filter out deleted users |
| `src/pages/dashboard/AdminOverview.tsx` | Add Canvasser Hours Tracker widget with week navigation; add doorsKnocked to export |
