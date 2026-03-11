

# Fix Plan: Welcome Modal Persistence + Negative YTD Numbers

## Issue 1: Welcome Modal Shows Every Time

**Root cause:** `CanvasserWelcomeModal` (and `WelcomeModal` for sales) writes `sessionStorage.setItem('welcome_modal_shown_...')` on close (line 277) but **never reads it** before deciding to show. Every render of the component re-fetches data and calls `setIsOpen(true)`.

**Fix:** Add a `sessionStorage.getItem` check at the top of the `useEffect` in both modals. If the key exists, skip all fetching and return early.

### File: `src/components/canvasser/CanvasserWelcomeModal.tsx`
- At the start of the `useEffect` (line 83), add:
  ```typescript
  if (sessionStorage.getItem(`welcome_modal_shown_${user.id}`)) return;
  ```

### File: `src/components/dashboard/WelcomeModal.tsx`
- Same guard at the start of its `useEffect`.

---

## Issue 2: Negative Numbers on YTD Canvasser Leaderboard

**Root cause:** `fetchCanvasserLeaderboardData.ts` aggregates `_delta` columns from `daily_canvasser_metric_entries`. When an admin corrects a value downward (e.g., leads_set from 3 to 0), the delta written is negative (e.g., -3). For YTD aggregation over many months, these negative deltas can cause totals to go below zero — particularly for canvassers with minimal activity where one correction wipes out their positive entries.

**Fix:** After aggregation, clamp all metric fields to a minimum of 0 before computing points and building the result set.

### File: `src/lib/fetchCanvasserLeaderboardData.ts`
- After the aggregation loop (line 62), add a clamping step:
  ```typescript
  aggregated.forEach((d, userId) => {
    aggregated.set(userId, {
      leadsSet: Math.max(0, d.leadsSet),
      leadsClosed: Math.max(0, d.leadsClosed),
      leadsWithDamage: Math.max(0, d.leadsWithDamage),
      leadsWithoutDamage: Math.max(0, d.leadsWithoutDamage),
      conversationsHad: Math.max(0, d.conversationsHad),
      notInterested: Math.max(0, d.notInterested),
      cancelledLeads: Math.max(0, d.cancelledLeads),
      hoursWorked: Math.max(0, d.hoursWorked),
      doorsKnocked: Math.max(0, d.doorsKnocked),
      pointsEarned: 0,
    });
  });
  ```

---

## Files to update

| File | Change |
|------|--------|
| `src/components/canvasser/CanvasserWelcomeModal.tsx` | Add sessionStorage guard at top of useEffect |
| `src/components/dashboard/WelcomeModal.tsx` | Add sessionStorage guard at top of useEffect |
| `src/lib/fetchCanvasserLeaderboardData.ts` | Clamp aggregated values to >= 0 after summing deltas |

No database changes needed.

