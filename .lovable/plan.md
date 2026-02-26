

# Add Convos, Not Interested, and Leads Set to Clock-Out Flow

## Overview

Add three new fields to the clock-out modal so canvassers can report their conversations had, not interested count, and leads set alongside doors knocked. These values will flow through the existing 3-tier metric system (daily, weekly, YTD) so they show up everywhere -- leaderboards, admin overview, reports, etc.

---

## Step 1: Database Migration

Add 3 new columns to `canvasser_shifts`:

```sql
ALTER TABLE public.canvasser_shifts
  ADD COLUMN conversations_had integer,
  ADD COLUMN not_interested integer,
  ADD COLUMN leads_set integer;
```

The daily, weekly, and YTD canvasser metric tables already have matching columns (`conversations_had_delta`, `not_interested_delta`, `leads_set_delta` on daily; `conversations_had`, `not_interested`, `leads_set` on weekly and YTD), so no changes needed there.

---

## Step 2: Update `src/lib/updateCanvasserHours.ts`

Expand the function signature to accept 3 additional optional parameters:
- `convosDelta` (default 0)
- `notInterestedDelta` (default 0)
- `leadsSetDelta` (default 0)

Update all 3 tiers to read and write these fields:

**Tier 1 (Daily):** Read existing `conversations_had_delta`, `not_interested_delta`, `leads_set_delta` and add the deltas.

**Tier 2 (Weekly):** Read existing `conversations_had`, `not_interested`, `leads_set` and add the deltas.

**Tier 3 (YTD):** Read existing `conversations_had`, `not_interested`, `leads_set` from `canvasser_metrics` and add the deltas.

All values clamped with `Math.max(0, ...)` as before.

---

## Step 3: Update `src/components/canvasser/TimeClockWidget.tsx`

**New state variables:**
- `conversationsHad` (string, default "")
- `notInterested` (string, default "")
- `leadsSet` (string, default "")

**Clock-Out Modal:** Add 3 new input fields after "Doors Knocked":
- Conversations Had (optional, number input)
- Not Interested (optional, number input)
- Leads Set (optional, number input)

**handleClockOut:** 
- Parse the 3 new fields to integers
- Store them on the `canvasser_shifts` record
- Pass them to `updateCanvasserHours()` so they propagate to all 3 tiers
- Reset the fields after clock-out

---

## Step 4: Update AdminTimeClock Shift History

The Admin TimeClock page's shift history table should also display the new columns (Convos, Not Int., Leads Set) so admins can see what each canvasser reported per shift. If the admin edit/add shift modals exist there, they should also include these fields.

---

## Files Summary

| Action | File |
|--------|------|
| Migration | Add 3 columns to `canvasser_shifts` |
| Modify | `src/lib/updateCanvasserHours.ts` -- add convos, not interested, leads set to all 3 tiers |
| Modify | `src/components/canvasser/TimeClockWidget.tsx` -- add 3 input fields to clock-out modal + pass to update function |
| Modify | `src/pages/admin/AdminTimeClock.tsx` -- show new columns in shift history table |

---

## Technical Notes

- The existing daily/weekly/YTD tables already have the correct columns for these metrics, so the only DB change is adding columns to `canvasser_shifts` to store the per-shift values.
- The `updateCanvasserHours` utility is used by both the canvasser clock-out and admin shift edit flows, so expanding it once covers both paths.
- Since `canvasser_shifts` uses `as any` casts for inserts/updates (due to the generated types), the new columns will work immediately after migration without waiting for type regeneration.

