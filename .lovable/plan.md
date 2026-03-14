

# Job Profitability Tracking System

## Overview
Admin-only feature to track costs, margins, and invoices per gutter estimate. RLS-enforced so sales reps cannot access the data at the database level.

## Step 1 — Database Migration
Run the user's provided SQL to create:
- `job-invoices` private storage bucket with admin-only RLS
- `job_profitability` table with generated columns (`gross_profit`, `profit_margin_pct`), admin-only RLS (SELECT, INSERT, UPDATE)

## Step 2 — New Component: `src/components/admin/JobProfitabilityPanel.tsx`
- Props: `estimateId`, `leadId`, `quotedPrice`, `commission`
- On mount: fetch existing `job_profitability` record by `estimate_id`
- Cost form: Material, Labor, Other (with conditional description field), Notes
- Read-only display of Quoted Price and Commission from props
- Live profit/margin calculation updating as inputs change
- Invoice upload to `job-invoices` bucket at path `{estimateId}/{filename}`
- Uploaded file list with thumbnails (images) or PDF icons, remove button
- Upsert on save (exclude generated columns), toast on success, then invoke `send-profitability-summary` edge function

## Step 3 — Edge Function: `supabase/functions/send-profitability-summary/index.ts`
- `verify_jwt = false` in config.toml, admin role check via `getClaims()` in code
- Receives job details + financials in request body
- Queries `user_roles` + `auth.users` for all non-archived admin emails
- Sends formatted HTML email via Resend with job financials breakdown

## Step 4 — Wire into `src/pages/admin/LeadDetail.tsx`
- After the "Saved Estimates" collapsible section (line ~727), add a new `CollapsibleSection` titled "Job Profitability"
- Only render when `isAdmin` is true and estimates exist
- Pass first estimate's `id`, `quoted_price`, and `commission` as props

## Files Changed

| File | Action |
|------|--------|
| DB migration | `job_profitability` table + `job-invoices` bucket + RLS |
| `supabase/config.toml` | Add `send-profitability-summary` entry |
| `src/components/admin/JobProfitabilityPanel.tsx` | New |
| `supabase/functions/send-profitability-summary/index.ts` | New |
| `src/pages/admin/LeadDetail.tsx` | Add profitability panel after estimates section |

No changes to `LeadDetailView.tsx` or any sales rep files.

