

# Fix: Date Range Calendar Not Working on Mobile

## Problem
The date range picker uses Radix `Popover` components nested inside a Radix `Dialog`. On mobile, this causes the popover calendar to be blocked by the dialog's modal overlay -- taps on calendar dates are intercepted and the popover either won't open or won't register clicks.

## Solution
Replace the Popover-based date pickers with **inline calendars** rendered directly in the dialog. This eliminates the Popover-inside-Dialog conflict entirely and works reliably on mobile.

Both the Canvasser and Production date range dialogs will be updated.

## Changes — `src/pages/admin/ReportSettings.tsx`

For both `CanvasserEODSettingsCard` and `ProductionEODSettingsCard`:

- Remove the `Popover` / `PopoverTrigger` / `PopoverContent` wrappers around each calendar
- Render `CalendarComponent` inline with a toggling mechanism: tap "Start Date" label/button to show that calendar, tap "End Date" to show the other
- Use a simple state (`'start' | 'end'`) to toggle which calendar is visible, keeping the dialog compact on mobile
- Selected dates display above the calendar as badges/chips
- This avoids any layering/modal conflicts

## Files Changed
- `src/pages/admin/ReportSettings.tsx` — replace popover calendars with inline toggle calendars in both date range dialogs

