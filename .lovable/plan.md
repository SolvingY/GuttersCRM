

# Applicant Pipeline, Email Notifications, Canvasser EOD Report & Role Routing

## Overview
This batch adds: Scheduled Interview stage, automated applicant stage-change emails, admin-triggered onboarding-complete notification, canvasser EOD daily summary report with configurable schedule/recipients, role-based application routing, and contracts column for canvasser metrics.

---

## STEP 1 — Database Migrations

**Migration 1a — Add columns to `job_applications`:**
```sql
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS interview_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS applicant_source text,
  ADD COLUMN IF NOT EXISTS desired_role text,
  ADD COLUMN IF NOT EXISTS routing_notified_at timestamptz;
```

**Migration 1b — Canvasser EOD report log + contracts columns:**
```sql
CREATE TABLE canvasser_eod_report_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  canvassers_included integer NOT NULL DEFAULT 0,
  recipients jsonb NOT NULL DEFAULT '[]',
  email_sent_at timestamptz,
  resend_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE canvasser_eod_report_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage EOD report log" ON canvasser_eod_report_log
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

ALTER TABLE canvasser_metrics ADD COLUMN IF NOT EXISTS contracts integer NOT NULL DEFAULT 0;
ALTER TABLE daily_canvasser_metric_entries ADD COLUMN IF NOT EXISTS contracts_delta integer NOT NULL DEFAULT 0;
ALTER TABLE weekly_canvasser_metrics ADD COLUMN IF NOT EXISTS contracts integer NOT NULL DEFAULT 0;
```

**Data insert — Seed Matt Fowler into report_recipients:**
```sql
INSERT INTO report_recipients (name, email, sort_order)
VALUES ('Matt Fowler', 'm.fowler@oknextgen.com', 7)
ON CONFLICT (email) DO NOTHING;
```

---

## STEP 2 — Applicant Pipeline UI: Add Scheduled Interview Stage

**`src/pages/admin/FutureTeamMates.tsx`:**
- Add `scheduled_interview: "bg-blue-500 text-white"` to statusColors
- Add "scheduled_interview" to stats row (5 stages now)
- Add status filter option and "Schedule Interview" button for contacted applicants
- When clicking "Schedule Interview", open `ScheduleInterviewModal`

**`src/pages/admin/ApplicantDetail.tsx`:**
- Add "scheduled_interview" to status dropdown
- Display interview date when set
- Add "Schedule Interview" button in actions
- When changing status to "contacted", invoke `notify-applicant-stage-change`

**New: `src/components/admin/ScheduleInterviewModal.tsx`:**
- DateTime input + optional notes textarea
- On confirm: update `job_applications` with status, `interview_scheduled_at`, notes
- Invoke `notify-applicant-stage-change` with `newStage: 'scheduled_interview'`

---

## STEP 3 — Edge Function: `notify-applicant-stage-change`

**New: `supabase/functions/notify-applicant-stage-change/index.ts`**

Config: **`verify_jwt = true`** (admin-only calls from authenticated frontend).

Accepts POST: `{ applicantId, newStage, interviewDateTime? }`

Per stage:
- **contacted**: Validate applicant email exists. Send confirmation email to applicant via Resend. Send internal routing email based on `desired_position`: canvassing → Matt Fowler, all others → Jonathan Whitton. Update `routing_notified_at`.
- **scheduled_interview**: Send interview confirmation to applicant with date/time. Notify routing contact.
- **hired**: Send internal email to Matt Fowler + Jonathan Whitton — "new contractor ready for field."

All emails from `notifications@oknextgen.com`, 1099 "contractor" language throughout.

---

## STEP 4 — Admin-Triggered Onboarding Complete Notification

**`src/components/admin/ContractorProfileSheet.tsx`:**
- Add a "Mark Onboarding Complete" button visible when contractor's `onboarding_complete` is false
- On click: verify all required onboarding steps are done (call `check_onboarding_complete` RPC), then set `onboarding_complete = true` on profiles, then invoke `notify-applicant-stage-change` with `newStage: 'hired'`
- Look up the contractor's `job_applications` record by matching user ID to find the applicant ID
- **Do NOT** trigger from the contractor's own OnboardingFlow completion — admin controls this

---

## STEP 5 — Edge Function: `send-canvasser-eod-report`

**New: `supabase/functions/send-canvasser-eod-report/index.ts`**

Config: `verify_jwt = false` (cron-triggered).

**Query** joins `profiles` + `user_roles(canvasser)` + `canvasser_shifts(today)` + `daily_canvasser_metric_entries(today)`. Uses **`AT TIME ZONE 'America/Chicago'`** on all timestamp columns so clock-in/out display in CT.

Includes canvassers who clocked in OR had metrics. Always sends even with zero activity ("No canvasser activity recorded today"). Flagged shifts in separate section. Open shifts show "Open" with live hours.

Recipients from `report_recipients` table. Logs to `canvasser_eod_report_log`.

**Cron schedule**: `0 2 * * *` UTC (9 PM CDT). Note: update to `0 3 * * *` when clocks fall back in November.

---

## STEP 6 — Report Settings: Canvasser EOD Configuration

**`src/pages/admin/ReportSettings.tsx`:**
- Add a new card: "Canvasser EOD Report Settings"
- **Send time**: dropdown for hour (default 9 PM CT) — stored in `report_settings` as `canvasser_eod_send_hour`
- **Frequency**: daily / weekdays only — stored as `canvasser_eod_frequency`
- **Recipients**: reuse `ReportRecipientsSelector` component (from `report_recipients` table) to pick who receives the EOD report — stored as `canvasser_eod_recipient_ids`
- "Send Test Report" button that invokes `send-canvasser-eod-report` manually
- The edge function reads these settings to determine recipients

---

## STEP 7 — Contracts Column in Leaderboards

**`src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx`** and **`src/components/dashboard/CanvasserLeaderboardTable.tsx`:**
- Add `contracts` to interface
- Add "Contracts" column in header, body, and footer
- Data-fetching pages pass contracts through from metrics

---

## Files Summary

| Area | Files |
|------|-------|
| DB | 1 migration (2 parts) + 1 data insert |
| Applicant UI | `FutureTeamMates.tsx`, `ApplicantDetail.tsx`, new `ScheduleInterviewModal.tsx` |
| Edge Functions | New `notify-applicant-stage-change` (verify_jwt=true), new `send-canvasser-eod-report` (verify_jwt=false) |
| Config | `supabase/config.toml` (2 entries) |
| Admin | `ContractorProfileSheet.tsx` (Mark Onboarding Complete button) |
| Report Settings | `ReportSettings.tsx` (canvasser EOD config card) |
| Leaderboards | `WeeklyCanvasserLeaderboardTable.tsx`, `CanvasserLeaderboardTable.tsx` |

