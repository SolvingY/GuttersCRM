

## Fix Deleted/Archived Users Showing on Overview and Leaderboards

### Problem 1: Deleted User "Da Man" Still Appears on Master Overview
"Da Man" was fully deleted (no profile exists), but their `canvasser_metrics` row remains. The current filtering only checks for `is_archived` in profiles -- a user with **no profile at all** slips through because they are not in the archived set.

### Problem 2: Archived Users Still Appear on Leaderboards
The Sales Rep Leaderboard (`Leaderboard.tsx`) and Admin Leaderboards (`AdminLeaderboards.tsx`) do not filter out archived users. Only the Canvasser Leaderboard (`CanvasserLeaderboard.tsx`) currently does this correctly.

---

### Fix 1: AdminOverview.tsx -- Handle Deleted Users (No Profile)

**Current logic:** Filter out users whose ID is in `archivedIds`. Users with no profile are not caught.

**New logic:** Instead of building an "archived" set, build an "active" set from profiles where `is_archived = false`. Only show users whose ID exists in the active set. Aggregates still include all users.

Changes:
- Sales reps section (around line 337): Change from `!archivedIds.has(...)` to `activeIds.has(...)` -- this excludes both archived AND deleted users
- Canvasser section (around line 442): Same pattern -- filter to only users present in active profiles

### Fix 2: Leaderboard.tsx (Sales Rep Portal) -- Filter Archived Users

Three places need updating (YTD, Weekly, Monthly fetches):

- **YTD fetch (line 120-126):** Already fetches `hidden_from_leaderboard`. Add `is_archived` to the profiles query and include archived users in the `hiddenUserIds` set (or a separate set). Stats still count toward team totals in the footer.
- **Weekly fetch (line 332-338):** Same -- add archived filtering.
- **Monthly fetch (line 436-442):** Same -- add archived filtering.

### Fix 3: AdminLeaderboards.tsx -- Filter Archived Users

Same pattern across all fetch functions:

- **Sales YTD (line 144-150):** Add `is_archived` to profiles query, exclude archived from display.
- **Sales Weekly/Monthly (line 252-258):** Same.
- **Canvasser YTD (line 395-401):** Already checks `hidden_from_leaderboard` but not `is_archived`. Add archived check.
- **Canvasser Weekly/Monthly:** These fetch from `weekly_canvasser_metrics` -- need to add archived filtering here too.

### Implementation Pattern

For all leaderboard pages, the profiles query changes from:
```
.select('id, hidden_from_leaderboard')
```
to:
```
.select('id, hidden_from_leaderboard, is_archived')
```

And the hidden set becomes:
```
const hiddenUserIds = new Set(
  profilesForHidden?.filter(p => p.hidden_from_leaderboard || p.is_archived).map(p => p.id) || []
);
```

For AdminOverview, the logic flips to an "active set" approach to also catch fully deleted users (no profile row at all).

### Important: Team Totals Preserved

All leaderboard table components (`LeaderboardTable`, `WeeklyLeaderboardTable`, `CanvasserLeaderboardTable`, `WeeklyCanvasserLeaderboardTable`) calculate their "Team Totals" footer from the `entries` prop they receive. Since archived/deleted users will be filtered out before passing to these components, their stats will NOT appear in team totals on leaderboards. This matches the requirement that archived users should not be visible -- their historical contribution is preserved in the database and in the Company Goals/Overview aggregate calculations.

### Summary of Files

| File | Change |
|---|---|
| `src/pages/dashboard/AdminOverview.tsx` | Switch from "archived set" to "active set" filtering for both sales reps and canvassers |
| `src/pages/dashboard/Leaderboard.tsx` | Add `is_archived` to profiles query; exclude archived from all 3 timeframes |
| `src/pages/admin/AdminLeaderboards.tsx` | Add `is_archived` to profiles query; exclude archived from all sales and canvasser timeframes |

