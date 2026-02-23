

# Fix YTD Canvasser Leaderboard + Hours Total

## Issues Found

1. **Admin YTD query missing fields**: The select query on line 406 of `AdminLeaderboards.tsx` does not include `hours_worked` or `canvasser_rank`, so hours show as 0 and canvasser rank badges are blank.
2. **Hours total shows dash**: The `WeeklyCanvasserLeaderboardTable` footer (line 184) displays a dash for the Hours column instead of summing up total hours.
3. **Close % already present**: The `WeeklyCanvasserLeaderboardTable` already displays Close % for both individual rows and team totals -- this is working correctly on all views that use this component (including YTD in both portals).

## Changes

### 1. AdminLeaderboards.tsx -- Add missing fields to YTD query

**Line 406**: Add `hours_worked` and `canvasser_rank` to the canvasser_metrics select:

```
.select('user_id, display_name, leads_set, leads_closed, leads_with_damage, leads_without_damage, conversations_had, not_interested, cancelled_leads, doors_knocked, hours_worked, canvasser_rank, yearly_goal, points, contest_points, wager_points')
```

**Line 459-461**: Add `canvasserRank` to the entry mapping so the rank badge (C1, C2, etc.) displays under each canvasser's name:

```
doorsKnocked: (entry as any).doors_knocked || 0,
hoursWorked: Number((entry as any).hours_worked) || 0,
canvasserRank: (entry as any).canvasser_rank || undefined,
pointsEarned: Number(entry.points) || 0,
```

### 2. WeeklyCanvasserLeaderboardTable.tsx -- Sum total hours in footer

**Line 50-52**: Add `totalHours` to the totals calculation:

```
const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);
```

Include `totalHours` in the return object.

**Line 184**: Replace the dash with the actual total:

Before: `{showHours && <td ...>---</td>}`
After: `{showHours && <td ...>{totals.totalHours}</td>}`

## Files Summary

| File | Change |
|------|--------|
| `src/pages/admin/AdminLeaderboards.tsx` | Add `hours_worked`, `canvasser_rank` to YTD select; map `canvasserRank` in entry |
| `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx` | Sum total hours in footer instead of showing dash |

