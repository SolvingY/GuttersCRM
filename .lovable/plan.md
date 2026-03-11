

# Fix: Include All Canvassers in Metrics + Weekly Updates Not Propagating

## Issue 1: Archived canvassers excluded from Overview and Company Goals

**Root cause**: `AdminOverview.tsx` (line 417) filters canvassers to only active, non-archived users. The Company Goals page already includes all canvassers (no archive filter). Your data confirms: active canvassers have 12 leads closed, archived have 5 more = 17 total.

**You want both pages to show ALL canvassers regardless of archive status**, so the numbers stay true for historical tracking.

**Fix in `AdminOverview.tsx`**:
- Line 417: Remove the `activeCanvasserIds` filter. Change from:
  ```
  const activeCanvassers = canvassers.filter(c => c.realUserId && activeCanvasserIds.has(c.realUserId) && currentCanvasserRoleIds.has(c.realUserId));
  ```
  to using ALL canvassers for aggregates and the canvasser details list. The `activeCanvasserIds` set and the profiles archive check can be removed entirely from the canvasser section.
- The aggregate totals (funnel, stats cards, leaderboard) will now include archived canvassers' historical numbers.

Both pages will then show 17.

## Issue 2: Weekly Updates entries not appearing in Canvasser Funnel, Overview Stats, or Canvasser Stats

**Root cause identified**: The Weekly Updates save flow works correctly — it updates `canvasser_metrics` (YTD totals), `weekly_canvasser_metrics`, and `daily_canvasser_metric_entries`. The data IS being written.

The issue is that the **AdminOverview canvasser query** (line 195-199) fetches `canvasser_metrics` but does NOT include all the columns needed. Specifically, it selects:
```
'id, user_id, display_name, leads_set, leads_closed, leads_with_damage, leads_without_damage, conversations_had, not_interested, hours_worked, doors_knocked, points, income, yearly_goal, metric_date, updated_at'
```

This query IS correct and includes all the necessary fields. However, the **CanvasserStats page** (individual canvasser dashboard) reads from `canvasser_metrics` with `select("*")` — this should also work.

The most likely cause is that when you edited stats in Weekly Updates **after** they were already saved, the delta calculation may have produced zero deltas (since `prevCanvDaily` already had the same values), resulting in no net change to `canvasser_metrics`. Let me verify the delta logic:

The save flow does: `delta = newValue - previousDailyEntry`. If you re-submit the same values, delta = 0, so `canvasser_metrics` gets `+0`. This is correct behavior — it's idempotent.

**But if you changed values after initial save**: The daily entry gets overwritten with the new absolute values, and the delta correctly adjusts the YTD totals. This should work.

**The real issue**: The `canvasser_metrics` update on line 570-582 uses `.eq('user_id', entry.userId)` without specifying which row (there's only one per user since it's the latest). But `.order('created_at', { ascending: false }).limit(1).single()` on line 567 gets the right row. The update then applies to ALL rows for that user — which is fine if there's only one.

Let me check if there's a mismatch — the query on line 567 uses `.single()` which will ERROR if there are multiple rows. If a canvasser has multiple `canvasser_metrics` rows, this would fail silently.

**Proposed investigation step**: I'll query the database to check for duplicate canvasser_metrics rows.

**However**, since the data IS flowing to leaderboards and timeclock but NOT to the funnel/overview/stats, the filter at line 417 (excluding archived users) is the primary blocker — removing it will fix the funnel and overview stats showing lower numbers.

## Plan

### Database check (read-only, no migration needed)
Verify no duplicate `canvasser_metrics` rows per user.

### File changes

**`src/pages/dashboard/AdminOverview.tsx`** — Remove archive filtering from canvasser section:
- Remove the `activeCanvasserIds` set creation (lines 372-374)
- Remove the canvasser profiles archive query if only used for filtering (keep it for name resolution)
- Line 417: Change filter to include all canvassers (only filter by role, not archive status)
- Line 419: Use all canvassers for aggregate totals
- Line 439: Use all canvassers for the details list

**`src/pages/admin/CompanyGoals.tsx`** — Already includes all canvassers. No change needed. Confirmed correct.

**No other files need changes.** The CanvasserStats page reads directly from `canvasser_metrics` for the logged-in user — if the Weekly Updates save wrote correctly, it will show. The issue is isolated to the AdminOverview filtering.

### Summary
- 1 file changed: `AdminOverview.tsx`
- Root cause: archive filter excluding 5 canvassers with historical data
- Both Overview and Company Goals will show identical totals (17 LTC)
- Funnel, stats cards, and leaderboard will reflect all canvasser data

