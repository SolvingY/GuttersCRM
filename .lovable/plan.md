

## Enhanced Hours Tracker: Edit, Move Days, and Sync Weekly/YTD Metrics

### What Changes

The Hours Tracker currently lets admins click a cell and change the hours value, but it only updates the daily entries table. It does not sync changes back to the weekly or yearly (YTD) canvasser metrics. This plan adds full synchronization and the ability to move hours between days.

### Changes

#### 1. Update `handleSaveHoursCell` to sync weekly and YTD metrics (AdminOverview.tsx)

When an admin edits a cell in the Hours Tracker:

- Calculate the **delta** (new value minus old value)
- Update `daily_canvasser_metric_entries` (already done)
- Update `weekly_canvasser_metrics` for that week: increment/decrement `hours_worked` by the delta
- Update `canvasser_metrics` (YTD): increment/decrement `hours_worked` by the delta
- If hours are set to 0, delete the daily entry (or set to 0) so the cell shows a dash

#### 2. Add "Move Day" capability (AdminOverview.tsx)

When an admin clicks an existing hours cell, provide a small dropdown or date-select option to move that entry to a different day within the same week:

- Show a small day-picker (Mon-Sun buttons) below the hours input when editing a cell that already has hours
- Selecting a different day will:
  - Delete (or zero out) the old daily entry
  - Upsert the new daily entry on the target day
  - If the target day is in a different week, update both weeks' `weekly_canvasser_metrics` (subtract from old week, add to new week)
  - Update local state so the UI reflects the change instantly

#### 3. Recalculate weekly points after hours changes

Since weekly points depend on leads (not hours), hours changes won't affect points. But the `weekly_canvasser_metrics.hours_worked` total must stay accurate.

### Technical Details

**File: `src/pages/dashboard/AdminOverview.tsx`**

1. Modify `handleSaveHoursCell` to:
   - Accept the old hours value as a parameter
   - Calculate delta = newHours - oldHours
   - After upserting daily entry, also update `weekly_canvasser_metrics` and `canvasser_metrics` with the delta

2. Add new state and handler for day-moving:
   - `movingHoursCell` state to track which cell is in "move mode"
   - `handleMoveHoursDay` function that:
     - Removes hours from old date's daily entry
     - Adds hours to new date's daily entry
     - Updates weekly metrics for both weeks (if crossing week boundaries)
     - Updates local `canvasserHoursData` state

3. Update the cell UI:
   - When editing a cell with existing hours, show day-selector buttons (Mon-Sun) beneath the input
   - Clicking a day button moves the hours to that day
   - Visual indicator (e.g., arrow icon) to hint that days can be moved

**Key sync logic (pseudocode):**
```
// On hours edit:
delta = newHours - oldHours
UPDATE weekly_canvasser_metrics SET hours_worked = hours_worked + delta WHERE user_id AND week_start
UPDATE canvasser_metrics SET hours_worked = hours_worked + delta WHERE user_id

// On day move:
UPDATE daily_canvasser_metric_entries SET hours_worked_delta = 0 WHERE user_id AND old_date
UPSERT daily_canvasser_metric_entries (user_id, new_date, hours_worked_delta = movedHours)
// If weeks differ:
UPDATE weekly_canvasser_metrics SET hours_worked = hours_worked - movedHours WHERE old_week
UPDATE weekly_canvasser_metrics SET hours_worked = hours_worked + movedHours WHERE new_week
```

### Summary

| File | Change |
|---|---|
| `src/pages/dashboard/AdminOverview.tsx` | Enhance `handleSaveHoursCell` to sync weekly + YTD metrics; add day-move UI and handler |

