

# Remote Contract Signing Feature

## Overview

Add the ability for reps to send customers a unique link to review and digitally sign their gutter contract remotely. The customer sees the exact same contract rendered read-only, signs at the bottom, and the rep gets notified automatically.

## Part 1 -- Database Migration

Add 6 new columns to `lead_forms`:

| Column | Type | Purpose |
|--------|------|---------|
| `signing_token` | uuid (default `gen_random_uuid()`) | Unique token for public signing URL |
| `token_expires_at` | timestamptz | When the signing link expires |
| `signing_ip` | text | IP address of signer (audit trail) |
| `customer_signed_at` | timestamptz | When the customer signed remotely |
| `customer_signed_name` | text | Typed legal name from customer |
| `sent_for_signing_at` | timestamptz | When the link was sent |

Plus:
- Unique index on `signing_token`
- RLS policy: public SELECT when token is valid, not expired, and status is 'sent' or 'draft'
- RLS policy: public UPDATE only when status is 'sent', transitioning to 'signed'

These public policies won't conflict with existing admin/rep/canvasser policies because RLS uses OR logic between PERMISSIVE policies, and these are correctly scoped.

## Part 2 -- Modify GutterContract.tsx

Add three new optional props: `readOnly`, `signingMode`, `onCustomerSign`.

**When `readOnly=true`:**
- All `<Input>` fields become `<p>` elements with clean text styling
- `<textarea>` becomes a `<div>` with `whitespace-pre-wrap`
- Checkboxes show static checked/unchecked icons
- Contract looks like a real document, not a grayed-out form

**When `signingMode=true`:**
- Hide "Save Draft", "Download PDF", "Sign & Save" buttons
- Hide rep signature pad (already signed in CRM)
- Show customer signing section at bottom: typed name input, signature pad, agreement checkbox, submit button

**Rep-facing additions:**
- "Send to Customer for Signature" button that saves/upserts the form with `status: 'sent'`, sets 7-day token expiry, calls `send-contract-signing-email`
- Status display: "Awaiting signature" with sent date and resend option, or "Signed by [name]" with timestamp
- Resend logic: reuses existing token if not expired, generates new token if expired

## Part 3 -- New Public Signing Page

**File:** `src/pages/public/SignContract.tsx`
**Route:** `/sign/:token` (outside `<ProtectedRoute>` in App.tsx)

Three state screens:
1. **Expired/invalid token** -- branded error with contact info
2. **Already signed** -- shows signed date and thank-you message
3. **Active** -- renders `<GutterContract readOnly signingMode>` with customer signing section

On successful signing:
- Updates `lead_forms`: status='signed', stores signature data, typed name, timestamp
- Calls `notify-contract-signed` edge function
- Shows branded success screen (no redirect)

## Part 4 -- Edge Function: send-contract-signing-email

**File:** `supabase/functions/send-contract-signing-email/index.ts`

- Uses `APP_URL` env var (fallback: `https://www.oknextgen.com`)
- Sends professional HTML email via Resend from `notifications@oknextgen.com`
- Includes: contract amount, rep name, signing link button, expiry date
- `verify_jwt = false` in config.toml

## Part 5 -- Edge Function: notify-contract-signed

**File:** `supabase/functions/notify-contract-signed/index.ts`

When customer signs:
1. Looks up lead and assigned rep's email via service role key
2. Emails rep with signed confirmation and link to lead detail
3. Updates `quote_requests.status` to 'scheduled'
4. Logs "Contract signed by [name]" to `lead_activity_log`
- `verify_jwt = false` in config.toml

## Part 6 -- Update App.tsx

Add public route outside authenticated wrapper:
```text
<Route path="/sign/:token" element={<SignContract />} />
```
Placed alongside other unauthenticated routes like `/auth`, `/apply`, `/get-quote`.

## Part 7 -- Update LeadDetailView.tsx

Update the contract button area (lines 231-235) to show signing status:
- Contract sent but not signed: amber "Awaiting Signature" badge + "Resend Link" button
- Contract signed remotely: green "Signed by [name]" badge with date

## Files Summary

| File | Action |
|------|--------|
| Database migration | Add 6 columns, index, 2 RLS policies to `lead_forms` |
| `src/pages/dashboard/forms/GutterContract.tsx` | Add `readOnly`, `signingMode`, `onCustomerSign` props; send button + status |
| `src/pages/public/SignContract.tsx` | New public signing page |
| `src/App.tsx` | Add `/sign/:token` route |
| `src/pages/dashboard/LeadDetailView.tsx` | Contract button signing status badges |
| `supabase/functions/send-contract-signing-email/index.ts` | New edge function |
| `supabase/functions/notify-contract-signed/index.ts` | New edge function |
| `supabase/config.toml` | Add `verify_jwt = false` for both new functions |

## Technical Notes

- The new columns won't exist in the auto-generated TypeScript types until the migration runs and types regenerate. Code will use `as any` casts for the new columns where needed.
- Both edge functions use `SUPABASE_SERVICE_ROLE_KEY` (already available) for admin-level database access.
- `RESEND_API_KEY` is already configured as a secret.
- `APP_URL` will need to be set as a secret for production URLs in the signing emails. Falls back to `https://www.oknextgen.com`.
- The existing `handleSave` flow for in-person signing remains completely unchanged.
- No changes to gutter forms, estimator, pricing, payment/scheduling, or existing email functions.

