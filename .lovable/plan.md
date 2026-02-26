
# Canvasser Time Clock System — Complete Implementation

## Overview

Build a full clock-in/clock-out system for canvassers that integrates with the existing 3-tier hours tracking (daily_canvasser_metric_entries -> weekly_canvasser_metrics -> canvasser_metrics). Includes canvasser-facing widget, shift history, admin shift management, and a flagged-shift notification edge function.

---

## Step 1: Database Migration

Create `canvasser_shifts` table with computed `hours_worked` column:

```sql
CREATE TABLE public.canvasser_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvasser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clock_in_at timestamptz NOT NULL DEFAULT now(),
  clock_out_at timestamptz,
  hours_worked numeric GENERATED ALWAYS AS (
    CASE 
      WHEN clock_out_at IS NOT NULL 
      THEN ROUND(EXTRACT(EPOCH FROM (clock_out_at - clock_in_at)) / 3600.0, 2)
      ELSE NULL 
    END
  ) STORED,
  doors_knocked integer,
  notes text,
  status text DEFAULT 'active',
  flagged_reason text,
  edited_by uuid REFERENCES auth.users(id),
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.canvasser_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Canvassers can manage own shifts"
  ON public.canvasser_shifts FOR ALL
  USING (auth.uid() = canvasser_id);

CREATE POLICY "Admins can manage all shifts"
  ON public.canvasser_shifts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
```

Key details:
- `hours_worked` is GENERATED ALWAYS -- never write to it directly
- `status` values: 'active', 'completed', 'flagged'
- No manager policy (no manager role in enum)

---

## Step 2: Create `src/lib/updateCanvasserHours.ts`

Shared 3-tier update utility used by both clock-out and admin edit flows:

- **Tier 1**: Upsert `daily_canvasser_metric_entries` (hours_worked_delta, doors_knocked_delta)
- **Tier 2**: Upsert `weekly_canvasser_metrics` with `weekStartsOn: 4` (Thursday) and **always include week_end** (weekStart + 6 days)
- **Tier 3**: Update `canvasser_metrics` YTD totals
- All values clamped with `Math.max(0, ...)`
- Accepts positive or negative deltas

---

## Step 3: Create `src/components/canvasser/TimeClockWidget.tsx`

Self-contained clock widget with three visual states:

**State A (Clocked Out):** "You are not clocked in" with large green Clock In button. Shows last shift summary below.

**State B (Clocked In):** Live timer updating every 60s via `setInterval` (with cleanup on unmount). Shows clock-in time and red Clock Out button. Clock Out opens a modal with optional doors knocked and notes fields. On confirm:
- Calculate hours from timestamps (not computed column): `Math.round((shiftMs / 3600000) * 4) / 4`
- Update shift record (never write `hours_worked`)
- Call `updateCanvasserHours()` with rounded hours and doors

**State C (Flagged):** Amber warning card for shifts open 12+ hours. Shows "Close Shift" button (opens clock-out modal) only. On mount, if active shift > 12h AND status is still 'active', auto-flag and invoke `notify-flagged-shift` once. If already 'flagged', just show warning UI without re-notifying.

---

## Step 4: Modify `src/pages/canvasser/CanvasserStats.tsx`

Insert `TimeClockWidget` after the "My Stats" heading (line 252) and before the Contests collapsible.

Add "My Recent Shifts" collapsible section after the TimeClockWidget:
- Queries last 20 shifts from `canvasser_shifts` for current user
- Table columns: Date, In, Out, Hours, Doors, Notes
- Flagged shifts highlighted amber; active shifts show "In Progress"
- Footer: "This Week: X hrs | This Month: X hrs" calculated client-side from shifts array

---

## Step 5: Modify `src/pages/dashboard/AdminOverview.tsx`

Add "Shift Management" collapsible section on the Canvasser tab, placed after the hours tracker grid (line 1311) and before the "Canvassers Needing Attention" alert (line 1313).

Three sub-sections:

**Active Status Table:**
- Queries `canvasser_shifts` where status = 'active' to find who is clocked in
- Shows all canvassers with status (Clocked In with live timer / Off / Flagged), today's hours, this week total

**Flagged Shifts Queue:**
- Queries `canvasser_shifts` where status = 'flagged' and clock_out_at IS NULL
- Lists with Edit and Dismiss buttons
- Dismiss sets status to 'completed' with admin-entered clock-out time

**Edit Shift Modal + Add Manual Shift:**
- Edit: reads old `hours_worked` from computed column, calculates delta to new times, calls `updateCanvasserHours` with delta
- Add: canvasser selector dropdown, clock in/out datetime inputs, doors, notes. Creates completed shift and calls `updateCanvasserHours` with full hours (no delta since starting from 0)
- Both track `edited_by` and `edited_at`

New state variables: `shiftManagementOpen`, `activeShifts`, `flaggedShifts`, `editShiftModalOpen`, `addShiftModalOpen`, `selectedShift`, etc.

---

## Step 6: Create `supabase/functions/notify-flagged-shift/index.ts`

Edge function following existing patterns (same as `notify-deal-won`):
- Accepts: canvasserId, canvasserName, clockInAt, hoursOpen
- Fetches admin emails via user_roles + auth.admin.getUserById
- Sends HTML email via Resend from `notifications@oknextgen.com`
- Subject: "Flagged Shift -- [Canvasser Name]"

---

## Step 7: Update `supabase/config.toml`

Add entry:
```toml
[functions.notify-flagged-shift]
verify_jwt = false
```

---

## Files Summary

| Action | File |
|--------|------|
| Migration | Create `canvasser_shifts` table + RLS |
| Create | `src/lib/updateCanvasserHours.ts` |
| Create | `src/components/canvasser/TimeClockWidget.tsx` |
| Create | `supabase/functions/notify-flagged-shift/index.ts` |
| Modify | `src/pages/canvasser/CanvasserStats.tsx` -- add TimeClockWidget + shift history |
| Modify | `src/pages/dashboard/AdminOverview.tsx` -- add shift management section |
| Modify | `supabase/config.toml` -- add notify-flagged-shift |

## Critical Implementation Notes

1. **Never write to `hours_worked`** on canvasser_shifts -- it is GENERATED ALWAYS STORED
2. **Always include `week_end`** when inserting weekly_canvasser_metrics rows (NOT NULL constraint)
3. **Clean up setInterval** on unmount to prevent memory leaks
4. **Flag notification fires once** -- only when status transitions from 'active' to 'flagged'
5. **Admin delta calculation** reads old hours from computed column, calculates new hours from timestamps
6. **Manual shift uses clock_in date** for tier placement, not today's date
7. **Existing hours tracker grid is untouched** -- both systems coexist writing to the same 3 tables
