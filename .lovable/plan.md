
Goal: make YTD/cumulative metrics update reliably when same-day Weekly Updates are edited, and make YTD leaderboard use the same source logic as Weekly/Monthly.

What I found
1) In `WeeklyUpdates.tsx`, Save All skips entries when all current fields are `0`.  
   - That prevents correction deltas from applying when a previously saved entry is changed back to zero.
2) Autosave-on-blur currently writes only daily rows, while YTD widgets read cumulative rows.  
   - So Weekly/Monthly can look correct immediately, but YTD/stats lag unless cumulative updates run.
3) Canvasser YTD leaderboard uses a different data source than Weekly/Monthly (`canvasser_metrics` vs daily aggregation), so drift appears even when Weekly/Monthly look right.

Implementation plan
1) Fix same-day edit delta handling (core bug)
- File: `src/pages/admin/WeeklyUpdates.tsx`
- Change skip logic so we only skip when:
  - current values are all zero, AND
  - baseline values are also all zero.
- If baseline had values and user changed to zero, still process deltas (including negatives) and update cumulative rows.
- Apply this to both Sales and Canvasser loops.

2) Make cumulative updates happen from the same edit flow
- File: `src/pages/admin/WeeklyUpdates.tsx`
- Unify blur/save behavior so edits do not silently update only daily rows:
  - Keep autosave draft upsert.
  - Immediately run the same delta commit path for that edited row (silent/no duplicate toast), so YTD/cumulative and dashboards stay in sync after each edit.
- Keep Save All as final bulk safety + attribution flow.

3) Align YTD leaderboard source with Weekly/Monthly logic
- File: `src/pages/canvasser/CanvasserLeaderboard.tsx`
- Replace YTD tab fetch to use date-range aggregation helper (fiscal-year start → today), same as Weekly/Monthly style aggregation.
- This ensures YTD reflects edited daily values using the same logic path.

4) Keep archived-history behavior consistent for tracking
- Files:
  - `src/lib/fetchCanvasserLeaderboardData.ts`
  - `src/pages/canvasser/CanvasserLeaderboard.tsx` (if needed)
- Remove archived-user exclusion from aggregate totals where historical tracking is expected, so YTD numbers stay truthful across active + archived users.

Validation checklist
1) Enter non-zero Weekly Update, save, verify:
- Canvasser YTD leaderboard updates
- Canvasser Stats key metrics/funnel update
- Admin Overview canvasser cards/funnel update

2) Edit same day from non-zero → different non-zero, verify YTD changes by exact delta.

3) Edit same day from non-zero → all zeros, verify cumulative values decrement correctly (no stale old totals).

4) Compare Weekly, Monthly, and YTD totals for the same user/date range and confirm consistency.

Files to update
- `src/pages/admin/WeeklyUpdates.tsx`
- `src/pages/canvasser/CanvasserLeaderboard.tsx`
- `src/lib/fetchCanvasserLeaderboardData.ts` (for archived-history inclusion consistency)

Technical notes
- No backend schema changes required.
- This is a logic/sync consistency fix in the frontend update flow and leaderboard sourcing.
- Main objective is eliminating split-brain behavior between “daily draft writes” and “cumulative display reads.”
