

## Plan: Auto-Flag Out-of-Zone Shifts + Notify All Roles

### Changes

**1. `src/components/canvasser/TimeClockWidget.tsx`**
- Add `outOfZone` param to `performClockIn(loc, outOfZone = false)`
- When `outOfZone` is true: set `status: "flagged"` instead of `"active"`, set `isFlagged` state to true
- After successful insert, fetch user name from `profiles` using `canvasser_id` (i.e. `user.id`), then invoke `supabase.functions.invoke("notify-flagged-shift", { body: { canvasserId: user.id, canvasserName, clockInAt, hoursOpen: 0, role: "Canvasser" } })`
- Update `handleConfirmOutOfZone` to call `performClockIn(pendingClockIn, true)`

**2. `src/components/shared/RoleTimeClockWidget.tsx`**
- Same pattern: add `outOfZone` param to `performClockIn`
- When `outOfZone`: set `status: "flagged"`, set `isFlagged` to true
- After insert, fetch name from `profiles` using `user_id` (i.e. `user.id`), invoke `notify-flagged-shift` with role label (map `user`→`Sales Rep`, `supplementer`→`Supplementer`, `office`→`Office`)
- Update `handleConfirmOutOfZone` to pass `true`

**3. `src/components/production/ProductionTimeClockWidget.tsx`**
- Same pattern for `production_shifts` using `user_id`
- Role passed as `"Production"`
- Update `handleConfirmOutOfZone` to pass `true`

**4. `supabase/functions/notify-flagged-shift/index.ts`**
- Accept optional `role` param from request body
- Update email subject: `⚠️ Flagged Shift — {name} ({role})` (falls back to no role suffix if not provided)
- Update email body: show `{name} ({role})` and change "Hours open" line to "Reason: Clocked in outside geofence zone" when `hoursOpen` is 0
- Redeploy after changes

**5. `src/pages/admin/NotificationRouting.tsx`**
- Line 25: change description from `'When a canvasser shift is flagged'` to `'When any team member shift is flagged'`

### Files touched

| File | Change |
|------|--------|
| `src/components/canvasser/TimeClockWidget.tsx` | Flag shift + notify on out-of-zone (uses `canvasser_id`) |
| `src/components/shared/RoleTimeClockWidget.tsx` | Flag shift + notify on out-of-zone (uses `user_id`) |
| `src/components/production/ProductionTimeClockWidget.tsx` | Flag shift + notify on out-of-zone (uses `user_id`) |
| `supabase/functions/notify-flagged-shift/index.ts` | Accept `role` param, update email copy |
| `src/pages/admin/NotificationRouting.tsx` | Update description text |

