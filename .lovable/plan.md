

# Enhanced Checklist Report Emails + Admin Report Library

## What's Changing

Three things:

1. **Rich email content** — The report email will include ALL checklist details inline (every checked/unchecked item with labels, notes, result, photos as signed-URL thumbnails, doc links) plus a "View in Dashboard" button linking to the CRM and a "Download PDF" option.

2. **Admin Report Library** — A new `/admin/sent-reports` page that queries `report_email_log` joined with submission data and profiles. Reports are grouped by date, showing who submitted each one, the type, property, and result. Clicking a report opens the full detail drawer (reusing the `SavedChecklists` detail view pattern).

3. **Email "View Report" link** — The email includes a link to the admin report library page filtered to that specific report, so recipients can click through to the CRM.

---

## 1. Enhance Email Content — `send-checklist-report/index.ts`

Currently the email shows minimal info (property name, homeowner, inspector, dates, item count summary). Changes:

- **Hail Assessments**: Fetch section labels from `HAIL_ASSESSMENT_SECTIONS` data (hardcode the section/item mapping in the edge function since it can't import client code). Render each checked item grouped by section with ✓/✗ marks.
- **Production Checklists**: Fetch the checklist template from `production_checklists` table to resolve item IDs → labels. Render each item with ✓/✗.
- **Photos**: Generate 1-hour signed URLs for up to 10 photos and embed as thumbnail images in the email.
- **Doc links**: Already rendered — keep as-is.
- **Notes**: Already rendered — keep as-is.
- **"View in Dashboard" button**: Link to `https://nextgenroofing.lovable.app/admin/sent-reports?id={report_email_log_id}` so admins can click through. The edge function will return the log ID after insert so it can be included in the email.
- **"Download Report" link**: Since PDF generation is complex in an edge function, we'll link to the dashboard view where they can already see the full report. The button text will say "View Full Report in Dashboard".

## 2. New Admin Page — `src/pages/admin/SentReports.tsx`

A new page at `/admin/sent-reports` that:

- Queries `report_email_log` joined with `profiles` (for sender name) and the submission tables for property/result data
- Groups reports by date (Today, Yesterday, This Week, This Month, Older)
- Each row shows: date/time, sender name, checklist type badge, property name, result badge, recipients
- Clicking a row opens a detail drawer showing the full report (reusing the pattern from `SavedChecklists` — fetch full submission data, resolve labels, show photos)
- Supports `?id=` query param to auto-open a specific report from email links

## 3. Wire Up Route + Nav

- **`App.tsx`**: Add `<Route path="sent-reports" element={<SentReports />} />` under admin routes
- **`AdminLayout.tsx`**: Add "Sent Reports" nav item under "System Settings" group with `FileText` icon, path `/admin/sent-reports`

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-checklist-report/index.ts` | Add full checklist items, photo thumbnails, "View in Dashboard" button to email HTML; resolve production checklist labels from DB |
| `src/pages/admin/SentReports.tsx` | **New** — Admin report library grouped by date with detail drawer |
| `src/App.tsx` | Add `/admin/sent-reports` route |
| `src/pages/admin/AdminLayout.tsx` | Add "Sent Reports" nav item |

