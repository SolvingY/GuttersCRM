

# Root Cause: Autosave-on-Blur Defeats Save All Delta Logic

## The Bug

The Weekly Updates page has two save paths that conflict:

1. **Autosave on blur** (`saveCanvasserDraft`, line 393): Immediately writes the new absolute values to `daily_canvasser_metric_entries` when a field loses focus
2. **Save All** (`executeSave`, line 536): Reads the *same* `daily_canvasser_metric_entries` row to calculate the delta between "new value" and "previous value"

Since autosave already wrote the new values, Save All reads them back and computes `delta = newValue - newValue = 0`. The YTD totals (`canvasser_metrics`) and weekly totals (`weekly_canvasser_metrics`) never get updated.

**This is why:**
- Leaderboards work — they aggregate from `daily_canvasser_metric_entries` directly
- Timeclock page works — it reads `daily_canvasser_metric_entries`  
- CanvasserStats shows stale data — reads from `canvasser_metrics` (YTD)
- AdminOverview shows stale data — reads from `canvasser_metrics` (YTD)
- Conversion Funnel shows stale data — reads from `canvasser_metrics`
- The same bug affects **sales reps** too (`saveSalesDraft` vs Save All for `user_metrics`)

## The Fix

**File: `src/pages/admin/WeeklyUpdates.tsx`**

Change the Save All delta calculation to compare against the **values loaded when the page opened** (or when the date was last changed), not against the current database row (which autosave already updated).

Specifically:

1. **Store the "baseline" daily values** when `loadSavedEntries` runs (on mount / date change). These are the values that existed *before* any edits in this session.

2. **In `executeSave`**, calculate deltas against these stored baselines instead of re-querying the database.

3. This applies to **both** the sales rep section (lines 464-466) and the canvasser section (lines 552-564).

### Implementation detail

Add two `useRef` maps to store baselines:

```typescript
const salesBaselines = useRef<Map<string, Record<string, number>>>(new Map());
const canvasserBaselines = useRef<Map<string, Record<string, number>>>(new Map());
```

In `loadSavedEntries`, after reading the daily entries, populate these refs with the loaded values (or zeros if no entry exists).

In `executeSave`, replace:
```typescript
const { data: prevCanvDaily } = await supabase.from('daily_canvasser_metric_entries')...
const dLeadsSet = weeklyLeadsSet - (Number(prevCanvDaily?.leads_set_delta) || 0);
```
with:
```typescript
const baseline = canvasserBaselines.current.get(entry.userId);
const dLeadsSet = weeklyLeadsSet - (baseline?.leads_set_delta || 0);
```

Same pattern for all canvasser fields and all sales rep fields.

### Files touched
- `src/pages/admin/WeeklyUpdates.tsx` — single file, ~30 lines changed

### What this fixes
- CanvasserStats Key Metrics (Leads Set, Conversations, etc.)
- CanvasserStats Conversion Funnel
- AdminOverview canvasser stats cards
- AdminOverview canvasser conversion funnel
- AdminOverview detailed stats table
- Sales rep stats (same bug existed but may not have been noticed yet)

