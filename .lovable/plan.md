

# Add Production Tab to Master Overview / Scoreboard

## Overview

Add a "Production" tab alongside Sales Reps, Canvassers, and Supplementers in the Admin Overview (Master Overview) page. This tab will display all production team members with their statistics, following the same pattern as the existing tabs.

## Data Source

Production metrics come from two tables:
- **`production_metrics`** — YTD totals per user: `builds_completed`, `build_issues`, `checklists_completed`, `build_efficiency`, `points`, `yearly_goal`, `display_name`
- **`production_shifts`** — Individual shifts with `hours_worked` for aggregating total hours

## Changes — `src/pages/dashboard/AdminOverview.tsx`

### 1. Add Production state and interfaces

Add a `ProductionAggregates` interface and `ProductionDetail` interface (similar to `CanvasserAggregates` / `CanvasserDetail`):

| Field | Source |
|---|---|
| Total Crew | count of production users |
| Builds Completed | sum of `builds_completed` |
| Build Issues | sum of `build_issues` |
| Checklists Completed | sum of `checklists_completed` |
| Hours Worked | sum from `production_shifts` (fiscal year) |
| Avg Efficiency | weighted average of `build_efficiency` |
| Points | from `production_metrics` |

### 2. Fetch production data in `fetchAdminData()`

- Query `production_metrics` for all production users (latest per user)
- Query `production_shifts` for hours worked (sum `hours_worked` per user, fiscal year filtered)
- Filter to active (non-archived) users with the `production` role via `user_roles`
- Build aggregate totals and detail rows

### 3. Add Production tab to `SectionCarousel`

After the Supplementers tab, add a new `SectionCarousel.Item` with `HardHat` icon showing:
- **6 StatsCards**: Total Crew, Builds Completed, Build Issues, Checklists, Hours Worked, Avg Efficiency
- **Detailed Stats accordion**: Table with columns — Name, Builds, Issues, Checklists, Efficiency %, Hours, Points, Actions (edit)
- **Production Leaderboard accordion** (optional, if `ScoreboardProductionLeaderboard` exists or inline ranking by points)

### 4. Add `HardHat` to imports

Already imported in some files; add to the AdminOverview import line.

### 5. Widget registry (optional)

Add `production_details` and `production_leaderboard` entries to `src/lib/widgetRegistry.ts` for the settings drawer visibility toggle.

## Files Changed
- `src/pages/dashboard/AdminOverview.tsx` — main changes (interfaces, fetch logic, Production tab UI)
- `src/lib/widgetRegistry.ts` — add production widget entries

