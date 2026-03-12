

# Hide Archived Canvassers from Leaderboards

## Changes

### 1. `src/lib/fetchCanvasserLeaderboardData.ts`
- Line 16: add `is_archived` to profile select
- Remove the `hiddenUserIds` skip on line 42 so all users get aggregated
- Build a combined `excludedUserIds` set (hidden OR archived) and use it when building final entries to set `isArchived: true`
- Rank only non-archived entries (archived get no rank)

### 2. `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx`
- Add `isArchived?: boolean` to `WeeklyCanvasserEntry` interface
- Totals computation stays unchanged (uses full `entries` array, so archived numbers count)
- Filter out `isArchived` entries from the rendered `<tbody>` rows

Two files changed, no database changes.

