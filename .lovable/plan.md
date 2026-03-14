

# Add Date Range Support to Canvasser EOD Report

## Changes

### 1. Update Edge Function — `supabase/functions/send-canvasser-eod-report/index.ts`
- Accept optional `report_date` (single date, `YYYY-MM-DD`) and `start_date`/`end_date` (range, `YYYY-MM-DD`) parameters
- When a range is provided, query shifts and daily entries across all dates in the range, aggregate per canvasser
- Email subject and header reflect the range (e.g., "March 10–13, 2026")
- Single `report_date` still supported for backward compatibility

### 2. Add "Send Date Range Report" UI — `src/pages/admin/ReportSettings.tsx`
- Add a "Send Date Range Report" button next to the existing "Send Test Report" button
- Clicking it opens a date range picker dialog (reuse the pattern from `ReportDateRangeModal` with start/end date pickers)
- On submit, invokes `send-canvasser-eod-report` with `{ start_date, end_date }`
- Shows success/error toast

### 3. Deploy the updated edge function

## Files Changed
- `supabase/functions/send-canvasser-eod-report/index.ts` — accept `report_date`, `start_date`, `end_date` params; aggregate across date range
- `src/pages/admin/ReportSettings.tsx` — add date range report dialog and send button

