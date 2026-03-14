

# Fix Duplicate Active Shifts

## Problem
Users can accumulate multiple open shifts because there's no database constraint preventing it. The UI hides the clock-in button when a shift is active, but race conditions and bugs allow duplicates.

## Changes

### 1. Database Migration
Single migration that:
- Closes duplicate open `canvasser_shifts` (keeps earliest, auto-closes rest with `status='completed'` and note)
- Closes duplicate open `production_shifts` (same logic)
- Creates partial unique index `idx_canvasser_shifts_one_active` on `canvasser_shifts(canvasser_id) WHERE clock_out_at IS NULL`
- Creates partial unique index `idx_production_shifts_one_active` on `production_shifts(user_id) WHERE clock_out_at IS NULL`

Uses exact SQL from user's request.

### 2. `src/components/canvasser/TimeClockWidget.tsx`
In `performClockIn` (line 188), before the insert at line 191, add active shift check:
- Query `canvasser_shifts` for existing open shift (`clock_out_at IS NULL`)
- If found, show error toast and return early

### 3. `src/components/production/ProductionTimeClockWidget.tsx`
In `performClockIn` (line 158), before the insert at line 161, add same guard:
- Query `production_shifts` for existing open shift (`clock_out_at IS NULL`)
- If found, show error toast and return early

### Files Not Changed
- `AdminTimeClock.tsx` — manual shifts always have `clock_out_at` set, no conflict with index

