
# GPS Location Tracking + Admin TimeClock Page

## Overview

Add GPS location capture on clock-in/clock-out, create a dedicated "TimeClock" admin page under HR Management, and consolidate the Hours Tracker + Shift Management into it with location visibility.

---

## Step 1: Database Migration

Add 4 new columns to `canvasser_shifts` for GPS coordinates:

```sql
ALTER TABLE public.canvasser_shifts
  ADD COLUMN clock_in_lat double precision,
  ADD COLUMN clock_in_lng double precision,
  ADD COLUMN clock_out_lat double precision,
  ADD COLUMN clock_out_lng double precision;
```

No new tables needed. No RLS changes (existing policies cover these columns).

---

## Step 2: Update TimeClockWidget.tsx -- Capture GPS on Clock-In and Clock-Out

**Clock-In flow:**
- Before inserting the shift, call `navigator.geolocation.getCurrentPosition()`
- Store the lat/lng in the `canvasser_shifts` insert: `clock_in_lat`, `clock_in_lng`
- If the user denies location permission, still allow clock-in but show a warning toast ("Location not captured -- enable location for tracking")
- Use a 10-second timeout on the geolocation request to avoid blocking

**Clock-Out flow:**
- Same pattern: capture GPS before the update
- Store as `clock_out_lat`, `clock_out_lng` in the shift update
- Again, if denied, proceed without coordinates but warn

The geolocation call will be wrapped in a helper:
```text
function getLocation(): Promise<{lat: number, lng: number} | null>
```
Returns null if permission denied or timeout.

---

## Step 3: Create New Admin Page -- `src/pages/admin/AdminTimeClock.tsx`

A dedicated page that consolidates:

1. **Canvasser Hours Tracker** -- the existing editable weekly grid (moved from AdminOverview Canvasser tab)
2. **Shift Management** -- the existing active/flagged shift panels + edit/add modals (moved from AdminOverview Canvasser tab)
3. **Shift History with Location** -- NEW section showing recent shifts across all canvassers with GPS pin links

**Shift History with Location section:**
- Table columns: Canvasser, Date, Clock In, Clock Out, Hours, Doors, Notes, Clock-In Location, Clock-Out Location
- Location columns show a clickable Google Maps link icon that opens `https://www.google.com/maps?q={lat},{lng}` in a new tab
- If no coordinates captured, show "--" instead
- Filterable by canvasser (dropdown) and date range
- Default: last 7 days of shifts across all canvassers

This page will import and reuse much of the existing logic currently in AdminOverview's Canvasser tab (hours tracker grid, shift management, edit/add shift modals). The code will be extracted from AdminOverview into this new page.

---

## Step 4: Add Route and Navigation

**App.tsx:** Add route `/admin/timeclock` pointing to `AdminTimeClock`

**AdminLayout.tsx:** Add "TimeClock" nav item under the "HR Management" group:
```text
{ icon: Clock, label: 'TimeClock', path: '/admin/timeclock' }
```
Placed after "Contractor Mgmt" and before "Future Team Mates".

---

## Step 5: Clean Up AdminOverview.tsx

Remove the "Canvasser Hours Tracker" collapsible and "Shift Management" collapsible from the Canvasser tab in AdminOverview. These sections will now live exclusively on the new TimeClock page.

The Canvasser tab will retain:
- Stats cards (Total Canvassers, Leads Set, etc.)
- Conversion Funnel
- Canvassers Needing Attention alert
- Canvasser Performance table

All state variables, handlers, and modal components related to hours tracking and shift management will move to the new AdminTimeClock page.

---

## Files Summary

| Action | File |
|--------|------|
| Migration | Add 4 GPS columns to `canvasser_shifts` |
| Modify | `src/components/canvasser/TimeClockWidget.tsx` -- add geolocation capture |
| Create | `src/pages/admin/AdminTimeClock.tsx` -- new dedicated page |
| Modify | `src/App.tsx` -- add `/admin/timeclock` route |
| Modify | `src/pages/admin/AdminLayout.tsx` -- add TimeClock nav item |
| Modify | `src/pages/dashboard/AdminOverview.tsx` -- remove hours tracker + shift mgmt sections |

---

## Technical Details

### Geolocation API
Uses the browser's built-in `navigator.geolocation.getCurrentPosition()`. No external libraries needed. Works on both desktop and mobile browsers. On mobile, this uses GPS; on desktop, it uses IP-based or WiFi-based location (less precise but still useful).

### Google Maps Links
Clock-in/out locations display as clickable map pin icons. Clicking opens Google Maps at the exact coordinates in a new tab. Format: `https://www.google.com/maps?q=35.4676,-97.5164`

### Location Permission Handling
- Location is optional -- never blocks clock-in/out
- If denied, a toast warns the canvasser
- Admin sees "--" for shifts without location data
- No persistent permission prompts -- browser handles the permission dialog natively

### Code Extraction from AdminOverview
The Hours Tracker and Shift Management sections (~400 lines of JSX + ~15 state variables + ~5 handlers) will be extracted from AdminOverview into AdminTimeClock. This significantly reduces AdminOverview's size (currently 1716 lines) and improves maintainability.
