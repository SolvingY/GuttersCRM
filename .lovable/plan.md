

# Fix Auto Clock-Out: 9 PM CST Cutoff + Single Notification

## Problems
1. **Duplicate notifications**: The auto-clockout runs client-side in `fetchShifts()` — every time the TimeClockWidget renders, it checks if the shift exceeds 4 hours and fires the notification again. Multiple tab opens or re-renders = multiple emails.
2. **4-hour limit too aggressive**: Need to change to 9 PM CST daily cutoff instead.
3. **Need reminder to Matt Fowler**: When canvassers are auto-clocked out at 9 PM, send a single notification email to Matt.

## Solution

### 1. Server-Side Scheduled Auto Clock-Out (New Edge Function)

**Create `supabase/functions/auto-clockout-9pm/index.ts`**

A scheduled edge function that runs at 9 PM CST (3:00 AM UTC next day, since CST = UTC-6) via pg_cron:
- Queries all `canvasser_shifts` where `status IN ('active', 'flagged')` and `clock_out_at IS NULL`
- For each open shift: calculates actual hours worked (capped at clock-in to 9 PM CST), updates the shift to `auto_closed`, records hours via direct DB updates
- Collects all auto-closed canvasser names
- Sends ONE summary email to m.fowler@oknextgen.com listing all canvassers who were auto-clocked out
- Register in `config.toml` with `verify_jwt = false`

### 2. Remove Client-Side Auto Clock-Out Logic

**Edit `src/components/canvasser/TimeClockWidget.tsx`**
- Remove the entire `if (hoursOpen > 4)` block (lines 115-160) that auto-closes shifts and fires `notify-auto-clockout`
- Keep the shift fetch logic but remove the auto-close behavior — shifts stay open until manually closed or the 9 PM cron runs

**Edit `src/components/production/ProductionTimeClockWidget.tsx`**
- Same removal of the 4-hour auto-close block

### 3. Remove Auto Clock-Out Notification Type from Admin

**Edit `src/pages/admin/NotificationRouting.tsx`**
- Remove the `auto_clockout` entry from the notification types array (line 19)

### 4. Schedule the Cron Job

Use the insert tool to create a pg_cron job that calls the edge function at 9 PM CST (3:00 AM UTC) daily.

### 5. Clean Up

- The existing `notify-auto-clockout` edge function can remain but will no longer be called from the client. The new `auto-clockout-9pm` function handles its own email sending directly.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/auto-clockout-9pm/index.ts` | **New** — Scheduled function to close all open shifts at 9 PM CST and send one summary email to Matt Fowler |
| `src/components/canvasser/TimeClockWidget.tsx` | Remove client-side 4-hour auto-close logic |
| `src/components/production/ProductionTimeClockWidget.tsx` | Remove client-side 4-hour auto-close logic |
| `src/pages/admin/NotificationRouting.tsx` | Remove `auto_clockout` notification type |
| `supabase/config.toml` | Add `auto-clockout-9pm` function config |

