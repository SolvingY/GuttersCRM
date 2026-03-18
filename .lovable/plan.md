

## Plan: Fix Timezone Handling + Devanae's Shift Visibility

### Problem Summary

**Issue 1 — Incorrect times everywhere:**
The root cause is that timestamps are stored in UTC but displayed/edited without converting to Central Time (America/Chicago). This affects three areas:
- **Flagged shift emails**: The `notify-flagged-shift` edge function formats times with `toLocaleString("en-US")` but does NOT specify `timeZone: "America/Chicago"`. Deno defaults to UTC, so 1:10 PM CST shows as "7:10 PM".
- **Edit Shift modal**: `shift.clock_in_at?.slice(0, 16)` takes the first 16 chars of a UTC ISO string (e.g., `2026-03-18T19:10`) and puts it in a `datetime-local` input. The browser interprets this as local time, but the value is UTC — showing the wrong time. When saved, `new Date(shiftClockIn).toISOString()` then double-converts, shifting the time again.
- **Shift history display**: `format(new Date(...), 'h:mm a')` uses the browser's local timezone. This is correct only if the admin's browser is set to CST. Otherwise it's wrong.

**Issue 2 — Devanae's shift not showing:**
Devanae has dual roles (canvasser + user/Sales Rep). She checked in today via the Sales Rep portal (`role_shifts` table, role=`user`). Her shift IS in the database with status `flagged`. The likely issue is the admin is looking at the **Canvassers** tab, but her shift is in the **Sales Reps** tab. This is expected behavior for dual-role users — the shift appears under whichever portal they checked in from.

### Changes

**1. Fix `notify-flagged-shift` edge function — add CST timezone**

Add `timeZone: "America/Chicago"` to the `toLocaleString` call on line 56 so the email displays Central Time.

File: `supabase/functions/notify-flagged-shift/index.ts`

**2. Fix Edit Shift modal — convert UTC to CST for display, CST back to UTC on save**

Create a helper function `utcToCentralLocal(isoString)` that converts a UTC ISO string to the equivalent `datetime-local` value in Central Time. Use this when populating the edit modal inputs.

On save, the reverse: treat the `datetime-local` value as Central Time and convert to UTC before storing.

This affects three places in AdminTimeClock.tsx:
- `handleEditShift` (canvasser) — line 329
- `RoleShiftManagement.handleEditShift` — line 1221
- `ProductionShiftManagement.handleEditShift` (if it exists)
- All corresponding save handlers

**3. Fix shift history time display — force Central Time**

Replace `format(new Date(shift.clock_in_at), 'h:mm a')` with a helper that explicitly formats in Central Time using `toLocaleTimeString('en-US', { timeZone: 'America/Chicago', ... })`. This ensures consistent display regardless of the admin's browser timezone.

Affects all time display calls in AdminTimeClock.tsx (shift history tables, active shift cards, flagged shift cards).

**4. Clarify Devanae's shift location (no code change)**

Devanae's flagged shift is visible under Admin → Check-In Management → **Sales Reps** tab → Shift Management. She checked in via the Sales Rep portal. No code fix needed — just a visibility clarification.

### Files touched

| File | Change |
|------|--------|
| `supabase/functions/notify-flagged-shift/index.ts` | Add `timeZone: "America/Chicago"` to date formatting |
| `src/pages/admin/AdminTimeClock.tsx` | Add UTC↔CST conversion helpers; fix edit modal population + save; fix all time display calls to use Central Time |

### Technical Detail

The core helper functions added to AdminTimeClock.tsx:

```text
utcToCentralLocal(isoString) → "YYYY-MM-DDTHH:MM" in Central Time
  - Used to populate datetime-local inputs

centralLocalToUTC(localString) → ISO string in UTC  
  - Used when saving edited shifts

formatCentralTime(isoString, formatStr) → formatted time in CST
  - Used for all display: "h:mm a", "MMM d", etc.
```

This ensures all admin-facing times and all email times are consistently Central Time, matching the business's operating timezone.

