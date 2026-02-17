

## Fix: Day-Move Buttons Not Working (Blur Race Condition)

### Problem Found

When testing the Hours Tracker, I confirmed the following:

**Editing hours works correctly:**
- Changed Chloe Cooper's Tuesday hours from 4.0 to 6.0
- Database confirmed: `daily_canvasser_metric_entries` updated to 6
- `weekly_canvasser_metrics.hours_worked` updated to 6
- `canvasser_metrics.hours_worked` (YTD) updated to 6
- Toast notification "Hours updated" appeared

**Moving hours between days does NOT work:**
- Clicking the "F" (Friday) button does nothing -- hours stay on Tuesday
- No network requests are made for the move

### Root Cause

This is a blur-before-click race condition. The input field has an `onBlur` handler that calls `handleSaveHoursCell`, which sets `setEditingHoursCell(null)`. When the user clicks a day-move button:

1. The input loses focus, triggering `onBlur`
2. `onBlur` calls `handleSaveHoursCell`, which sets `setEditingHoursCell(null)`
3. React re-renders, removing the day-move buttons from the DOM
4. The click event on the day-move button never fires

### Fix

**File: `src/pages/dashboard/AdminOverview.tsx`**

Use `onMouseDown` with `e.preventDefault()` on the day-move buttons. This prevents the input from losing focus when the button is pressed, allowing the `onClick` to fire normally.

Change the day-move buttons from:
```tsx
<button
  onClick={() => handleMoveHoursDay(...)}
>
```
to:
```tsx
<button
  onMouseDown={(e) => {
    e.preventDefault();
    handleMoveHoursDay(...);
  }}
>
```

### Cleanup

After the fix, revert Chloe Cooper's test data back to the original 4 hours (or keep at 6 if acceptable).

### Summary

| Issue | Fix |
|---|---|
| Day-move buttons don't fire due to blur race condition | Use `onMouseDown` + `preventDefault()` instead of `onClick` |

