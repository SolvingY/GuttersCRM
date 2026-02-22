

# Add Sunday Option and Update Report Time to 6 PM

## Changes

### `src/pages/admin/ReportSettings.tsx`

1. Add "Sunday" as a day option (value "0") to the weekly day-of-week select dropdown, placing it after Friday.
2. Update the info card text from "8:00 AM" to "6:00 PM" to reflect the new send time.

### `supabase/functions/send-scheduled-report/index.ts`

If the cron schedule references 8 AM, update it to 6 PM (18:00 UTC or appropriate timezone offset). This ensures the actual send time matches the UI.

## Files Modified

| File | Change |
|---|---|
| `src/pages/admin/ReportSettings.tsx` | Add Sunday option (value "0"), change "8:00 AM" to "6:00 PM" |
| Cron schedule (if applicable) | Update to 6 PM send time |

