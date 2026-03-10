

# Fix Canvasser EOD Report — Recipients UI, Active Filtering, Zero-Hours Filtering

## Changes

### 1. UI: Replace checkbox recipients with add/toggle/remove pattern (`NotificationRouting.tsx`)

Replace the `CanvasserEODCard` recipients section. Instead of `ReportRecipientsSelector` (checkboxes from `report_recipients` table), use the same `notification_routing` table pattern as the other cards — type `canvasser_eod_report`. This gives the same "+ Add" button, email input, toggle on/off, and X to delete.

- Add `canvasser_eod_report` to the `NOTIFICATION_TYPES` array (with BarChart3 icon distinction)
- OR: keep `CanvasserEODCard` as its own component but replace the recipients section with inline notification_routing queries for type `canvasser_eod_report`
- Remove `ReportRecipientsSelector` import and usage
- Remove the `canvasser_eod_recipient_ids` save logic (no longer needed)

Best approach: Add a recipients sub-section inside `CanvasserEODCard` that queries/mutates `notification_routing` with `notification_type = 'canvasser_eod_report'`, reusing the exact same toggle/add/delete pattern from `NotificationCards`.

### 2. Edge function: Only include non-archived, active canvassers (`send-canvasser-eod-report/index.ts`)

Currently queries ALL users with canvasser role. Fix:
- Join with `profiles` to filter out `is_archived = true`
- After building canvasser data, skip entries where `hours = 0` (canvasser had metric entries but admin removed their hours)
- Update "Active today" count denominator to only count non-archived canvassers

### 3. Edge function: Read recipients from `notification_routing` instead of `report_recipients`

Replace the current recipient logic (reads `canvasser_eod_recipient_ids` from `report_settings`, then filters `report_recipients`) with a simple query: `notification_routing` where `notification_type = 'canvasser_eod_report'` and `is_active = true`.

## Files

| File | Change |
|------|--------|
| `src/pages/admin/NotificationRouting.tsx` | Replace checkbox recipients in CanvasserEODCard with notification_routing-based add/toggle/remove UI |
| `supabase/functions/send-canvasser-eod-report/index.ts` | Filter archived canvassers, skip 0-hour entries, read recipients from notification_routing |

