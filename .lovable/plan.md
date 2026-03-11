

# Points System Audit — Issues Found & Fix Plan

## Issues Identified

### Issue 1: `points_earned` never written to daily entries
Both the **autosave draft** (lines 454-469, 436-448) and the **Save All** (lines 765-773, 661-668) flows write daily entries **without** `points_earned`. The column defaults to 0.

This means:
- `fetchCanvasserLeaderboardData` aggregates `points_earned` from daily rows → always 0
- `CanvasserPointsHistory` filters `gt('points_earned', 0)` → finds nothing from daily entries
- `PointsHistory` (sales) same issue

### Issue 2: Canvasser cumulative `points` never updated on blur
`handleCanvasserBlur` (line 567-579) updates all cumulative metrics EXCEPT `points`. The canvasser points formula `(closed * 10) + (damage * 5) + (leadsSet * 1)` is only applied in the Save All path to `weekly_canvasser_metrics`, never to the cumulative `canvasser_metrics.points` column or daily entries.

### Issue 3: `CanvasserYTDRankingWidget` reads stale cumulative table
Still reads from `canvasser_metrics.points` (line 34-36) — same split-brain issue we fixed for the leaderboard/stats. Should compute points from daily entry aggregation.

### Issue 4: `CanvasserStats` reads stale `points` and `income`
Line 130-131: `points: configData?.points || 0` and `income: configData?.income || 0` come from `canvasser_metrics` cumulative table. `income` should be summed from daily entries like other performance fields. Points should be computed from aggregated performance data.

## Fix Plan

### 1. Write `points_earned` to daily entries in all save paths
**File: `src/pages/admin/WeeklyUpdates.tsx`**

**Canvasser paths:**
- In `saveCanvasserDraft` (line 454): add `points_earned` calculated from the current entry values using the canvasser formula
- In Save All canvasser upsert (line 765): add `points_earned` using same formula
- In `handleCanvasserBlur` (line 567): add `points` delta to cumulative update

**Sales paths:**
- In `saveSalesDraft` (line 436): add `points_earned` using `calculatePoints()`
- In Save All sales upsert (line 661): add `points_earned` using `calculatePoints()`

### 2. Compute points from daily aggregation instead of cumulative table
**File: `src/pages/canvasser/CanvasserStats.tsx`**
- Remove `points` and `income` from the `canvasser_metrics` config query
- Compute points from summed daily values: `(summed.leads_closed * 10) + (summed.leads_with_damage * 5) + summed.leads_set`
- Add `income_delta` to the daily aggregation reduce
- Add contest_points + wager_points from `canvasser_metrics` config if needed

**File: `src/components/canvasser/CanvasserYTDRankingWidget.tsx`**
- Replace `canvasser_metrics.points` query with daily entry aggregation (fiscal year start → today)
- Compute points from aggregated leads_closed, leads_with_damage, leads_set using same formula
- Still get `display_name` from `canvasser_metrics`

### 3. Fix leaderboard points computation
**File: `src/lib/fetchCanvasserLeaderboardData.ts`**
- Instead of reading `d.points_earned` (which may be 0 for historical data), **compute** points from the aggregated performance fields: `(leadsClosed * 10) + (leadsWithDamage * 5) + leadsSet`
- This makes points always consistent with the underlying data, regardless of whether `points_earned` was written

## Files to update
| File | Change |
|------|--------|
| `src/pages/admin/WeeklyUpdates.tsx` | Write `points_earned` to daily entries in draft/save/blur paths; update canvasser cumulative `points` on blur |
| `src/lib/fetchCanvasserLeaderboardData.ts` | Compute points from aggregated fields instead of reading `points_earned` column |
| `src/pages/canvasser/CanvasserStats.tsx` | Compute points + income from daily aggregation |
| `src/components/canvasser/CanvasserYTDRankingWidget.tsx` | Aggregate from daily entries instead of cumulative table |

No database changes needed.

