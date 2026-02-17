

## Fix Canvasser Hours Tracker Display + Add Edit Capability

### Root Cause

The "Canvasser Hours Tracker" reads hours from `daily_canvasser_metric_entries`, but the "Daily Updates" (WeeklyUpdates.tsx) page never writes to that table when saving canvasser data. It only writes to `canvasser_metrics` (YTD totals) and `weekly_canvasser_metrics` (weekly aggregates). That is why all hours show as dashes.

### Plan

#### 1. Write daily entries when saving canvasser data (WeeklyUpdates.tsx)

After saving canvasser metrics (around line 441), add a step to upsert into `daily_canvasser_metric_entries` for the selected date. This records per-day granular data including `hours_worked_delta` along with all other daily metrics (leads, doors, etc.).

The upsert will use `user_id` + `entry_date` as the conflict key so re-saving on the same day overwrites rather than duplicates.

#### 2. Make hours cells editable in the Hours Tracker (AdminOverview.tsx)

Convert each hour cell from a read-only display into a clickable/editable input:
- Clicking a cell opens an inline input or small input field
- Manager can type a new hours value
- On blur or Enter, the value is saved (upserted) to `daily_canvasser_metric_entries` for that user + date
- The totals column updates automatically
- A toast confirms the save

#### Technical Details

**File: `src/pages/admin/WeeklyUpdates.tsx`**

In the canvasser save loop (after line 440, before `successCount++`), add:

```typescript
// Also save to daily_canvasser_metric_entries for the hours tracker
await supabase
  .from('daily_canvasser_metric_entries')
  .upsert({
    user_id: entry.userId,
    entry_date: format(selectedDate, 'yyyy-MM-dd'),
    hours_worked_delta: weeklyHoursWorked,
    leads_set_delta: weeklyLeadsSet,
    leads_closed_delta: weeklyLeadsClosed,
    leads_with_damage_delta: weeklyLeadsWithDamage,
    leads_without_damage_delta: weeklyLeadsWithoutDamage,
    conversations_had_delta: weeklyConversationsHad,
    not_interested_delta: weeklyNotInterested,
    doors_knocked_delta: weeklyDoorsKnocked,
    income_delta: weeklyIncome,
    entered_by: (await supabase.auth.getUser()).data.user?.id,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id,entry_date',
  });
```

**File: `src/pages/dashboard/AdminOverview.tsx`**

Update the Hours Tracker table cells (lines 1085-1089) to be editable:
- Add state to track editing (which cell is being edited)
- Each cell becomes an input when clicked
- On save, upsert to `daily_canvasser_metric_entries` with the new hours value
- Refresh the hours data after save
- Show visual feedback (highlight) for edited cells

### Summary

| File | Change |
|---|---|
| `src/pages/admin/WeeklyUpdates.tsx` | Insert into `daily_canvasser_metric_entries` when saving canvasser daily data |
| `src/pages/dashboard/AdminOverview.tsx` | Make hours cells editable with inline save to the database |

