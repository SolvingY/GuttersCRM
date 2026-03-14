
Root cause identified:
- The updates were made in `src/pages/admin/ReportSettings.tsx`, but the actual Admin → Reports screen uses `src/pages/admin/NotificationRouting.tsx` via route `/admin/notifications`.
- That is why you still don’t see “Send Date Range Report” in the Canvasser EOD card on the live Reports page.

Plan to fix (in the correct file):
1. Update `CanvasserEODCard` in `src/pages/admin/NotificationRouting.tsx`
   - Add a visible “Send Date Range Report” button directly in this card (full-width row for mobile).
   - Add date-range dialog state (`rangeDialogOpen`, `rangeStart`, `rangeEnd`, `activeCalendar`, `sendingRange`).
   - Add inline calendar date selection (no nested popover) and keep calendar interactive with `pointer-events-auto`.
   - On submit, invoke `send-canvasser-eod-report` with `{ start_date, end_date }`.
   - Keep the existing Save/Test buttons unchanged.

2. Ensure mobile visibility and usability
   - Keep action area stacked for small screens so the date-range action cannot be hidden/wrapped off-screen.
   - Use the same inline start/end toggle pattern already proven in your other implementation.

3. (Consistency cleanup) Add Production date-range action to Reports page too
   - Add a `ProductionEODCard` in `NotificationRouting.tsx` (or port existing logic) so both Canvasser and Production range reports live on the same Reports screen.
   - Reuse the same dialog/calendar interaction pattern.

4. Keep existing backend behavior
   - No backend migration required.
   - Reuse existing report functions (`send-canvasser-eod-report`, `send-production-eod-summary`) that already support date ranges.

Technical details:
- Files to update:
  - `src/pages/admin/NotificationRouting.tsx` (primary fix)
- Imports likely needed:
  - `format` from `date-fns`
  - `Dialog` components
  - `Calendar` UI component
  - `CalendarRange` icon
  - `cn` utility (if styling class composition is used)
- No database schema/RLS/auth changes.

Verification steps after implementation:
1. Open Admin → Reports (`/admin/notifications`) on mobile width.
2. Scroll to Canvasser EOD card and confirm “Send Date Range Report” is visible.
3. Open dialog, select start/end dates, and send.
4. Confirm success toast and recipient count response.
5. Repeat for Production date range card on same page.
