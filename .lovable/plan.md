
# Add "Canceled Leads" Metric + Fix Labels + Fix Team Totals + Move Hours Tracker

## Summary

Four changes:
1. Add a new "Canceled Leads" metric to the database and all tracking surfaces
2. Rename "Canceled" to "Not Interested" on the weekly/monthly leaderboard (it currently shows `not_interested` data under a "Canceled" header)
3. Fix team totals footer rows that show dashes instead of actual sums
4. Move the Canvasser Hours Tracker above the "Canvasser Performance" table in Admin Overview
5. Add missing columns (Convos, Not Interested, Canceled) to the YTD canvasser leaderboard

## Part 1 -- Database Migration

Add `cancelled_leads` column to three tables:
- `canvasser_metrics`: `cancelled_leads INTEGER DEFAULT 0`
- `weekly_canvasser_metrics`: `cancelled_leads INTEGER DEFAULT 0`
- `daily_canvasser_metric_entries`: `cancelled_leads_delta INTEGER DEFAULT 0`

No new RLS policies needed -- existing policies cover these tables.

## Part 2 -- WeeklyUpdates.tsx (Data Entry)

- Add `weeklyCancelledLeads` to the `CanvasserWeeklyEntry` interface
- Add a "Canceled" input field in the canvasser entry form (after "Not Int.")
- Update the header grid from 11 columns to 12 columns
- Update save logic to:
  - Compound `cancelled_leads` into `canvasser_metrics` (YTD)
  - Compound `cancelled_leads` into `weekly_canvasser_metrics` (weekly)
  - Save `cancelled_leads_delta` into `daily_canvasser_metric_entries` (daily)
- Update form reset to clear `weeklyCancelledLeads`

## Part 3 -- WeeklyCanvasserLeaderboardTable.tsx (Weekly/Monthly View)

- Rename header "Canceled" to "Not Interested"
- Add new `cancelledLeads` field to `WeeklyCanvasserEntry` interface
- Add a new "Canceled" column after "Not Interested" displaying `cancelledLeads`
- Fix team totals to sum Convos, Not Interested, Canceled, w/ Damage, w/o Damage (currently showing dashes)

## Part 4 -- CanvasserLeaderboardTable.tsx (YTD View)

- Add `conversationsHad`, `notInterested`, `cancelledLeads` to the `CanvasserLeaderboardEntry` interface
- Add Convos, Not Interested, and Canceled columns to the table (matching weekly layout)
- Fix team totals to sum all numeric columns (currently showing dashes for w/ Damage, w/o Damage, and the Points column shows a ratio instead of total points)

## Part 5 -- AdminLeaderboards.tsx (Data Fetching)

- YTD fetch: Add `conversations_had`, `not_interested`, `cancelled_leads`, `leads_without_damage`, `doors_knocked` to the `canvasser_metrics` select query and pass them through to `CanvasserLeaderboardTable`
- Weekly/Monthly fetch: Add `cancelled_leads` to the `weekly_canvasser_metrics` select query and pass it through to `WeeklyCanvasserLeaderboardTable`

## Part 6 -- AdminOverview.tsx (Move Hours Tracker)

Move the "Canvasser Hours Tracker" section (currently at lines 1185-1326, after "Canvasser Performance" table) to appear right after the "Team Conversion Funnel" section (after line 1102) and before the "Canvassers Needing Attention" alert and "Canvasser Performance" table.

## Files Summary

| File | Action |
|------|--------|
| Database migration | Add `cancelled_leads` to 3 canvasser tables |
| `src/pages/admin/WeeklyUpdates.tsx` | Add Canceled input + save/reset logic |
| `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx` | Rename "Canceled" to "Not Interested", add "Canceled" column, fix team totals |
| `src/components/dashboard/CanvasserLeaderboardTable.tsx` | Add Convos/Not Interested/Canceled columns, fix team totals |
| `src/pages/admin/AdminLeaderboards.tsx` | Fetch and pass new fields to table components |
| `src/pages/dashboard/AdminOverview.tsx` | Move Hours Tracker above Canvasser Performance table |

## Technical Details

### Column Order (All Canvasser Tables)
Place | Canvasser | Doors | Convos | Not Interested | Canceled | Leads Set | w/ Damage | w/o Damage | Closed | Close % | Points

### Team Totals Fix
Currently the footer shows dashes for Convos, Not Interested, w/ Damage, w/o Damage. These will be changed to actual sums:
- `totalConvos = entries.reduce((sum, e) => sum + e.conversationsHad, 0)`
- `totalNotInterested = entries.reduce((sum, e) => sum + e.notInterested, 0)`
- `totalCancelled = entries.reduce((sum, e) => sum + e.cancelledLeads, 0)`
- `totalWithDamage = entries.reduce((sum, e) => sum + e.leadsWithDamage, 0)`
- `totalWithoutDamage = entries.reduce((sum, e) => sum + e.leadsWithoutDamage, 0)`

### Hours Tracker Repositioning
The Hours Tracker block (currently the last section in the Canvassers tab) will move to appear directly after the Team Conversion Funnel card and before the "Needs Attention" alert section.
