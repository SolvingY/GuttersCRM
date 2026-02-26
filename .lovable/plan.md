

# Fix Time Clock Data Flow Issues

## Root Causes Identified

### Issue 1: "My Recent Shifts" not updating after clock-out
The `TimeClockWidget` calls `fetchShifts()` internally after clock-out, but the parent `CanvasserStats.tsx` component fetches shifts independently on mount and never re-fetches. After clocking out, the widget updates itself but the shift history table stays stale showing "No shifts recorded yet."

**Fix**: Add a callback prop to `TimeClockWidget` so it can notify `CanvasserStats` to re-fetch shifts after clock-out. In `CanvasserStats`, pass an `onShiftChange` callback that triggers a re-fetch of the shifts array.

### Issue 2: Hours showing as 0 in the hours tracker
The shift was very short (27 seconds = 0.01h computed). The clock-out logic rounds to nearest 15 minutes: `Math.round(0.0075 * 4) / 4 = 0`. So 0 hours was written to all 3 tiers. This is technically correct math but unhelpful for real short shifts.

**Fix**: Set a minimum of 0.25h (15 min) when the shift has a non-zero duration. If `roundedHours` rounds to 0 but the shift actually had some duration, clamp to 0.25.

### Issue 3: Doors knocked not visible in admin hours tracker grid
The doors (10) DID register correctly in all 3 database tiers (daily: 10, weekly: 10, YTD: 10). The admin "Canvasser Hours Tracker" grid only displays `hours_worked_delta` from daily entries -- it doesn't show doors knocked. This is expected behavior for that grid. The doors are tracked in the metrics correctly.

No code change needed for this -- the doors are stored. They show up in the canvasser's Key Metrics and in the admin's Edit Canvasser Metrics modal.

---

## Changes

### File: `src/components/canvasser/TimeClockWidget.tsx`
- Add `onShiftChange?: () => void` prop
- Call `onShiftChange?.()` after successful clock-out and clock-in
- Add minimum 0.25h floor: if `roundedHours === 0` and shift had duration, use 0.25

### File: `src/pages/canvasser/CanvasserStats.tsx`
- Extract shift fetching into a standalone `fetchShifts` function
- Pass `onShiftChange={fetchShifts}` to `TimeClockWidget`
- This ensures the "My Recent Shifts" table and summary stats refresh immediately after any clock action

---

## Technical Details

Clock-out minimum hours logic:
```text
const roundedHours = Math.round((shiftMs / 3600000) * 4) / 4;
const finalHours = roundedHours === 0 && shiftMs > 0 ? 0.25 : roundedHours;
```

The callback pattern ensures both components stay in sync without needing global state or context.

