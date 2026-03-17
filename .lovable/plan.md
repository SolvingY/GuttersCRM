

## Fix: Add Canceled Leads to YTD Canvasser Leaderboard

The "Canceled" column shows 0 for all canvassers in the YTD view because `cancelled_leads_delta` is never aggregated from `daily_canvasser_metric_entries`. The data exists in the database but is dropped at every layer of the pipeline.

### Changes required in `src/pages/dashboard/AdminOverview.tsx`

**1. Add to `CanvasserDetail` interface (line 77-95):**
Add `cancelledLeads: number;` to the interface.

**2. Add to `dailySumsByUser` Map type and aggregation (lines 239-258):**
- Add `cancelledLeads: number` to the Map's value type
- Add `cancelledLeads: 0` to the default object
- Add `existing.cancelledLeads += e.cancelled_leads_delta || 0;` in the aggregation loop

**3. Add to canvasser construction (lines 431-445):**
- Add `cancelledLeads: 0` to the fallback `perf` object
- Add `cancelledLeads: perf.cancelledLeads` to the returned object

### Changes required in `src/components/dashboard/ScoreboardCanvasserLeaderboard.tsx`

**4. Add to `CanvasserDetail` interface (lines 14-23):**
Add `cancelledLeads: number;`

**5. Add to YTD entries mapping (lines 42-57):**
Add `cancelledLeads: c.cancelledLeads,` to the mapped object so it flows through to `WeeklyCanvasserEntry.cancelledLeads`.

### No other files need changes
- `WeeklyCanvasserLeaderboardTable.tsx` already has `cancelledLeads` in its interface and renders the column correctly
- `fetchCanvasserLeaderboardData.ts` already aggregates `cancelled_leads_delta` for weekly/monthly views (which is why those views work)

