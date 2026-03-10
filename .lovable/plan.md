

# Fix Canvasser EOD Report — Names, Recipients, UI Order

## Issues Found

1. **Names showing "Unknown"**: The edge function queries `profiles.display_name`, but `profiles` has NO `display_name` column. Canvasser names are stored in `canvasser_metrics.display_name`. It falls back to `profiles.full_name`, but that's also empty for some users.

2. **Sent to too many people**: The edge function ignores the saved EOD recipient settings (`canvasser_eod_recipient_ids` in `report_settings`) and instead sends to ALL active `report_recipients` (7 people). It should only send to the selected subset.

3. **Card order**: Move Canvasser EOD Report card up to appear right after Flagged Shifts notification card.

4. **Add button style**: The EOD card is missing the "+ Add" button that other notification cards have (it uses `ReportRecipientsSelector` instead, which is fine — but the card header should match the other cards' layout).

## Plan

### 1. Fix Edge Function (`supabase/functions/send-canvasser-eod-report/index.ts`)

**Name resolution**: After getting profiles, also query `canvasser_metrics` for `display_name`. Use priority: `canvasser_metrics.display_name` → `profiles.full_name` → "Unknown".

**Recipient filtering**: Read `canvasser_eod_recipient_ids` from `report_settings`. If set, filter `report_recipients` to only those IDs. If not set, fall back to all active recipients.

### 2. Reorder Cards (`src/pages/admin/NotificationRouting.tsx`)

Move `<CanvasserEODCard />` to render right after `<NotificationCards />` (which ends with Flagged Shifts), before `<ScheduledReportCard />`.

### 3. Match Add Button Style

The EOD card currently has no header action button. The recipients are managed inline with checkboxes (ReportRecipientsSelector), which is actually a better UX than the email input pattern. No change needed here — the card already has a clean layout. The "Add" button pattern doesn't apply since recipients come from a managed list with checkboxes.

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/send-canvasser-eod-report/index.ts` | Fix name resolution via `canvasser_metrics`; filter recipients by saved EOD settings |
| `src/pages/admin/NotificationRouting.tsx` | Reorder: EOD card after notification cards, before scheduled report |

