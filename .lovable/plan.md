

# Add Date Range Support to Production EOD Report

## Test Result: Canvasser Date Range Report
Successfully sent the past week's canvasser report (March 7-13) — 5 canvassers included, delivered to 3 recipients.

## Plan: Production EOD Date Range Support

### 1. Update Edge Function — `supabase/functions/send-production-eod-summary/index.ts`
- Accept optional `report_date`, `start_date`, and `end_date` parameters from request body
- When a range is provided, query `production_daily_logs` across all dates (removing the `email_sent = false` filter for historical reports)
- Aggregate per-contractor: sum builds, checklists, hours; combine notes and tasks
- Email subject/header reflects range (e.g., "March 7 – 13, 2026") vs single date
- For single-date or range reports, skip marking logs as `email_sent = true` (to avoid blocking the nightly auto-send)
- Also accept `test_email` to override recipients

### 2. Add Production EOD Date Range UI — `src/pages/admin/ReportSettings.tsx`
- Add a new `ProductionEODSettingsCard` component (currently there is no production EOD card in the UI)
- Include a "Send Date Range Report" button that opens the same date picker dialog pattern used by the canvasser card
- On submit, invokes `send-production-eod-summary` with `{ start_date, end_date }`
- Shows success/error toast

### Files Changed
- `supabase/functions/send-production-eod-summary/index.ts` — accept date params, aggregate across range
- `src/pages/admin/ReportSettings.tsx` — add Production EOD settings card with date range dialog

