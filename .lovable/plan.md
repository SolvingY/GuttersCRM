

# Fix Silent Metric Update Failures in Clock-Out Flow

## Root Cause

Sean's first shift on Mar 14 (1:03–1:50 PM) completed successfully — the `canvasser_shifts` row was updated to "completed" — but the `updateCanvasserHours` call that writes to `daily_canvasser_metric_entries` **failed silently**. The daily metric entry wasn't created until 10:57 PM when the admin manually added a second shift.

The core bug: `updateCanvasserHours` in `src/lib/updateCanvasserHours.ts` performs 3 database operations (daily entry upsert, YTD update) but **never checks for errors** on any of them. Each `await supabase.from(...).insert/update(...)` returns `{ data, error }`, but `error` is ignored. If an insert fails (e.g., RLS denial, constraint violation, network blip), it fails silently and the shift is recorded as "completed" with no metrics written.

## Changes

### 1. `src/lib/updateCanvasserHours.ts` — Add error handling to all DB operations

- Check the `error` property on every Supabase call (select, insert, update)
- Throw descriptive errors so callers can catch and surface them
- This is the single most critical fix — all consumers (clock-out, admin edit, admin manual shift, admin dismiss) will benefit

### 2. `src/components/canvasser/TimeClockWidget.tsx` — Improve error reporting

- The `handleClockOut` try/catch already exists, but currently if `updateCanvasserHours` fails silently, the shift shows as "completed" with a success toast
- After the fix in #1, errors will now properly throw and be caught
- Add a more specific error message: "Shift saved but hours tracking failed — contact your admin"
- Separate the shift update from the metrics update so the shift is still saved even if metrics fail, but the user is warned

### 3. `src/pages/admin/AdminTimeClock.tsx` — Add error handling to admin flows

- In `handleSaveEditShift`, `handleDeleteShift`, `handleAddManualShift`, and `handleDismissShift`: wrap `updateCanvasserHours` calls with try/catch and surface errors via toast
- Currently these also silently swallow metric update failures

## Files Changed

| File | Change |
|------|--------|
| `src/lib/updateCanvasserHours.ts` | Add error checking on all 3 DB operations, throw on failure |
| `src/components/canvasser/TimeClockWidget.tsx` | Separate shift save from metric update, warn user on partial failure |
| `src/pages/admin/AdminTimeClock.tsx` | Add error handling around updateCanvasserHours calls in all admin flows |

