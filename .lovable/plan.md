

# Standardize Canvasser Leaderboard Columns Across All Views

## Problem
The YTD canvasser leaderboard (both canvasser portal and admin) uses a different table component (`CanvasserLeaderboardTable`) with Contracts Goal and % of Goal columns. The weekly/monthly views use `WeeklyCanvasserLeaderboardTable` with Close % and standard columns. All three timeframes should display identical metrics. The admin view should additionally show Hours.

## Changes

### 1. CanvasserLeaderboard.tsx (Canvasser Portal)

**Replace YTD table component**: Switch from `CanvasserLeaderboardTable` to `WeeklyCanvasserLeaderboardTable` for the YTD tab.

**Update YTD fetch query** (line 101): Add `conversations_had`, `not_interested`, `cancelled_leads` to the select.

**Remap YTD data** (lines 169-197): Map entries to `WeeklyCanvasserEntry` format with `pointsEarned` instead of `points`, and include `conversationsHad`, `notInterested`, `cancelledLeads`, `hoursWorked`.

**Update YTD state type**: Change `ytdEntries` from `CanvasserEntry[]` to use the `WeeklyCanvasserEntry` type from the component.

**Update weekly fetch** (line 222): Add `cancelled_leads` to the select query and pass `cancelledLeads` through in the mapping.

**Update monthly aggregation** (lines 317-331): Add `cancelledLeads` to the initial value and aggregation logic.

**Remove unused import**: Remove `CanvasserLeaderboardTable` import and the local `CanvasserEntry` interface.

### 2. AdminLeaderboards.tsx (Admin Portal)

**Replace YTD canvasser render** (line 954): Switch from `<CanvasserLeaderboardTable entries={canvasserYtdEntries} />` to `<WeeklyCanvasserLeaderboardTable entries={canvasserYtdEntries} showHours={true} />`.

**Update YTD canvasser state type** (line 91): Change from `CanvasserEntry[]` to `WeeklyCanvasserEntry[]` (already imported).

**Remap YTD data** (lines 481-500): Map to `WeeklyCanvasserEntry` format with `pointsEarned`, `hoursWorked`, `cancelledLeads`, etc. instead of `points`, `yearlyGoal`, `percentOfGoal`, etc.

**Remove unused import**: Remove `CanvasserLeaderboardTable` import (line 8) and the local `CanvasserEntry` interface (lines 50-62).

### No other files change
The `WeeklyCanvasserLeaderboardTable` component already has all the correct columns (Doors, Convos, Not Int., Canceled, Leads Set, w/ Damage, w/o Damage, Closed, Close %, optionally Hours, Points) and correct team totals. No changes needed there.

## Column Layout (All Views)

**Canvasser Portal** (no hours): Place | Canvasser | Doors | Convos | Not Int. | Canceled | Leads Set | w/ Damage | w/o Damage | Closed | Close % | Points

**Admin Portal** (with hours): Place | Canvasser | Doors | Convos | Not Int. | Canceled | Leads Set | w/ Damage | w/o Damage | Closed | Close % | Hours | Points

## Technical Notes

- YTD data comes from `canvasser_metrics` table (cumulative). The `points` field maps to `pointsEarned` and `hours_worked` maps to `hoursWorked` in the `WeeklyCanvasserEntry` interface.
- Contest/wager points breakdown tooltip will continue to work since those fields are optional in the interface.
- Team totals will calculate correctly across all views since `WeeklyCanvasserLeaderboardTable` already sums all columns including `cancelledLeads`.

