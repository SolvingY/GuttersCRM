

# Fix Hours on Wrong Day + Move Report Settings to Notifications

## Part 1: Fix UTC Timezone Bug (Hours Recorded on Wrong Day)

### Problem
`toISOString().split('T')[0]` converts to UTC, shifting dates forward for evening US timezone shifts (e.g., 9 PM CST Thursday becomes Friday in UTC).

### Fix
Replace all `.toISOString().split('T')[0]` with `format(date, 'yyyy-MM-dd')` from date-fns (which uses local timezone).

**File: `src/lib/updateCanvasserHours.ts`** (lines 22-25)
- Add `format` to the date-fns import
- Fix `entryDate`, `weekStart`, and `weekEnd` to use `format(date, 'yyyy-MM-dd')`

**File: `src/pages/admin/AdminTimeClock.tsx`**
- Fix `getWeekStartForDate` and `getWeekEndForDate` helpers
- Fix the hours tracker grid date generation

## Part 2: Move Report Settings to Notifications Page

### Changes

**File: `src/pages/admin/AdminLayout.tsx`** (lines 93-101)
- Remove `{ icon: BarChart3, label: 'Report Settings', path: '/admin/reports' }` from "Competitions and Tracking"

**File: `src/pages/admin/NotificationRouting.tsx`**
- The existing "Weekly Reports" card at the bottom already links to Report Settings -- this stays as-is and serves as the entry point

This means "Report Settings" is accessed exclusively through the Notifications page (HR Management > Notifications > "Go to Report Settings" link), keeping all email/report routing in one logical place.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/updateCanvasserHours.ts` | Replace 3 UTC date conversions with local `format()` |
| `src/pages/admin/AdminTimeClock.tsx` | Replace 3 UTC date conversions with local `format()` |
| `src/pages/admin/AdminLayout.tsx` | Remove Report Settings from Competitions and Tracking nav group |

