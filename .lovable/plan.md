

# Fix: Hide Archived Canvassers from Admin Overview Leaderboard (YTD)

## Problem
The Admin Overview's canvasser leaderboard YTD tab uses `canvasserDetails` built in `AdminOverview.tsx`. On line 442, it filters canvassers with `canvassers.filter(c => c.realUserId)` — but unlike sales reps (line 360), it does **not** filter out archived users using `activeIds`. Weekly/Monthly tabs work correctly because they use `fetchCanvasserLeaderboardByDateRange` which already excludes archived users.

## Fix

### File: `src/pages/dashboard/AdminOverview.tsx`
- **Line 442**: Change the filter to also exclude archived users:
  ```
  const activeCanvassers = canvassers.filter(c => c.realUserId && activeIds.has(c.realUserId));
  ```

That's it — one line change. The `activeIds` set (line 282) already excludes archived profiles. The aggregates on lines 444-458 will then only include active canvassers, matching the behavior of the other leaderboard views.

| File | Change |
|------|--------|
| `src/pages/dashboard/AdminOverview.tsx` | Filter canvassers by `activeIds` on line 442 |

No database changes needed.

