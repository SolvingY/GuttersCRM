

# Batch: Checklist Job Assignment, Reports, Saved Checklists & Email Recipients

## Summary

This batch adds job linking, homeowner info, a two-stage Save → Send Report flow, a Saved Checklists library, and a recipient-selectable email system. All built as shared infrastructure across both Commercial Hail Assessment and Production Checklists.

---

## Step 1 — Database Migration

Single migration with 4 parts:

**1a.** Add columns to `commercial_hail_assessments`: `homeowner_name`, `homeowner_phone`, `homeowner_email`, `job_id` (FK to `quote_requests`), `report_finalized`, `report_finalized_at`, `report_notes`, `saved_at`.

**1b.** Add same columns to `production_checklist_submissions`.

**1c.** Create `report_recipients` table with RLS (authenticated SELECT for active, admin ALL). Seed 6 recipients (Jonathan, Kara, Michael, Robert, Evan, Aldo).

**1d.** Create `report_email_log` table with RLS (user sees own, admin sees all). Columns: `checklist_type`, `submission_id`, `sent_by`, `recipients` (jsonb), `sent_at`, `resend_message_id`.

---

## Step 2 — Edge Function: `send-checklist-report`

**New file:** `supabase/functions/send-checklist-report/index.ts`

- `verify_jwt = false` in config.toml (validate JWT in code via `getClaims()`)
- Accepts POST: `{ checklistType, submissionId, recipients, senderName }`
- Fetches submission from the appropriate table
- Fetches signed URLs for photos (1hr expiry) — NOT embedded inline, just referenced as count
- Builds HTML email: header, job/property info, homeowner details, inspector, result, report notes, checklist summary, photo count note, doc links, footer
- Sends via Resend from `notifications@oknextgen.com`
- Inserts to `report_email_log`
- Updates submission: `report_finalized = true`, `report_finalized_at = now()`
- Returns `{ success, messageId }`

---

## Step 3 — Shared UI Components (all in `src/components/shared/`)

**3a. `JobSearchInput.tsx`** — Search-as-you-type querying `quote_requests` by `street_address` or `full_name` (ILIKE). Dropdown results. On select, returns job record for auto-fill.

**3b. `HomeownerFields.tsx`** — Three inputs (Name, Phone, Email). Auto-populated from selected job. Editable after auto-fill.

**3c. `ReportRecipientsSelector.tsx`** — Fetches `report_recipients` (active, ordered). Multi-select checkboxes showing name + email. Validation: at least 1 selected.

**3d. `SendReportModal.tsx`** — Modal with auto-filled property/inspector/result info + `ReportRecipientsSelector`. Calls `send-checklist-report` edge function on confirm.

---

## Step 4 — Update `CommercialHailAssessmentForm.tsx`

- Add `JobSearchInput` + `HomeownerFields` to meta section (below existing fields)
- Add "Report Notes" textarea above submit area
- Change submit to **"Save Checklist"** — saves with `report_finalized = false`, `saved_at = now()`, includes new homeowner/job/notes fields
- Success state shows "Saved" with link to Saved Checklists (no longer says "submitted")
- Remove the old single-submit-and-done flow

---

## Step 5 — Update `ProductionChecklists.tsx`

- Add `JobSearchInput`, `HomeownerFields`, and Report Notes textarea to checklist submission modal
- Change submit button to "Save Checklist" — includes new fields, sets `saved_at = now()`
- Success toast links to Saved Checklists

---

## Step 6 — Saved Checklists Page

**New file:** `src/pages/tools/SavedChecklists.tsx`

- Routes: `/dashboard/tools/saved-checklists` and `/production/tools/saved-checklists`
- Fetches both `commercial_hail_assessments` and `production_checklist_submissions` where `saved_at IS NOT NULL` for current user
- Unified table: Type (badge), Date, Property/Job, Homeowner, Result, Finalized status, Actions
- Actions: View (read-only drawer), Send Report (opens `SendReportModal`), Assign to Job (inline `JobSearchInput`)
- Add tool card to both `ToolsHub.tsx` and `ProductionToolsHub.tsx`
- Add lazy import + routes in `App.tsx`

---

## Step 7 — Admin View Updates

Update `HailAssessmentsTab.tsx`:
- Add "Finalized" column (green check or pending badge)
- Add "Emails Sent" column (count from `report_email_log` where `checklist_type = 'hail_assessment'`)
- Detail drawer: add email history section showing recipients and timestamps

---

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | New: alter 2 tables + create 2 tables + seed recipients |
| `supabase/functions/send-checklist-report/index.ts` | **New** — email delivery edge function |
| `supabase/config.toml` | Add function config (auto-managed) |
| `src/components/shared/JobSearchInput.tsx` | **New** |
| `src/components/shared/HomeownerFields.tsx` | **New** |
| `src/components/shared/ReportRecipientsSelector.tsx` | **New** |
| `src/components/shared/SendReportModal.tsx` | **New** |
| `src/pages/tools/SavedChecklists.tsx` | **New** |
| `src/pages/tools/CommercialHailAssessmentForm.tsx` | Edit — add job/homeowner fields, report notes, two-stage save flow |
| `src/pages/production/ProductionChecklists.tsx` | Edit — add job/homeowner fields, report notes, save flow |
| `src/pages/dashboard/ToolsHub.tsx` | Add Saved Checklists card |
| `src/pages/production/ProductionToolsHub.tsx` | Add Saved Checklists card |
| `src/components/admin/HailAssessmentsTab.tsx` | Add finalized + email count columns, email history in drawer |
| `src/App.tsx` | Add 2 routes for SavedChecklists |

