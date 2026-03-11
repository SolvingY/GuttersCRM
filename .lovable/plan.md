# Fix Plan: Weekly Updates Display Issues

## Issue 1: "Detailed Stats" not updating after Weekly Updates save

**Root cause:** AdminOverview.tsx reads `canvasser_metrics` (YTD) on initial load. Weekly Updates correctly writes to `canvasser_metrics`, but AdminOverview has no realtime                     subscription on `canvasser_metrics` — so the admin must manua                                        lly reload to see changes.                                                                     

**Fix:** Add a realtime subscription in AdminOverview.tsx that listens for changes on `canvasser_metrics` and triggers a data refetch.

## Issue 2: Canvasser Key Metrics / Funne                                                                                                                                              l / Conversion Funnel not updating after Weekly Updates

**Root cause:** `CanvasserStats.tsx` reads from `canvasser_metrics` on mount only (no realt                                       ime). When admin saves Weekly Updates, the YTD table IS updated, but the canvasser's stats page won't reflect it until page reload.

**Fix:** Add a realtime subscription in CanvasserStats.tsx on the `canvasser_metrics` table (filtered by the canvasser's user_id) to auto-refetch when data changes.

## Issue 3: "Save All" clears the input fields

**Root cause:** After a successful save, lines 669-670 in WeeklyUpdates.tsx reset ALL entry fields to empty strings (`''`). The inputs then show blank instead of the values that were just saved. The user has to switch dates and come back to reload the saved data from the database.

**Fix:** After save completes, instead of clearing fields to empty strings, reload the saved daily entries from the database for the current date. This is already implemented as the `loadSavedEntries` logic triggered by `selectedDate` changes — we just need to call it again after save.

## Changes

### 1. `src/pages/admin/WeeklyUpdates.tsx`

- Remove lines 669-670 that clear entries to empty strings after save
- Instead, re-trigger the daily entries load by calling the existing `loadSavedEntries` logic after save succeeds
- Extract the `loadSavedEntries` function from the useEffect so it can be called independently, then call it at the end of `executeSave`

### 2. `src/pages/dashboard/AdminOverview.tsx`

- Add a realtime subscription on `canvasser_metrics` table that triggers a data refetch when rows change

### 3. `src/pages/canvasser/CanvasserStats.tsx`

- Add a realtime subscription on `canvasser_metrics` table (filtered by current user) that triggers `fetchMetrics()` when data changes