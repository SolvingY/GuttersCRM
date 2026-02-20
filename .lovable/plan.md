

# Fix Email Sender Addresses + Add Application Notification Emails

## Summary
Three changes: fix the "from" address on two backend functions, and create a new backend function that emails three people when a job application is submitted.

---

## 1. Fix sender address in `send-scheduled-report`
**File:** `supabase/functions/send-scheduled-report/index.ts`
- Change the `from` field from `"Next Gen Roofing <onboarding@resend.dev>"` to `"Next Gen Roofing <reports@oknextgen.com>"`

## 2. Fix sender address in `send-weekly-digest`
**File:** `supabase/functions/send-weekly-digest/index.ts`
- Change the `from` field from `"Next Gen Roofing <onboarding@resend.dev>"` to `"Next Gen Roofing <reports@oknextgen.com>"`

## 3. Create new backend function: `notify-new-application`
**File:** `supabase/functions/notify-new-application/index.ts` (new)

When called, sends a styled notification email to:
- m.fowler@oknextgen.com
- j.whitton@oknextgen.com
- k.jameson@oknextgen.com

Email includes:
- Applicant name, email, phone
- Desired position and years of experience
- DNA score and alignment category
- Direct link to the admin Future Team Mates page

Sends from: `notifications@oknextgen.com`

## 4. Update config
**File:** `supabase/config.toml`
- Add `[functions.notify-new-application]` with `verify_jwt = false` (public application form calls it without auth)

## 5. Update application form to trigger notification
**File:** `src/pages/apply/JobApplication.tsx`

After the successful database insert, add a fire-and-forget call:
```text
supabase.functions.invoke('notify-new-application', {
  body: { fullName, email, phone, desiredPosition, yearsExperience, dnaScore, alignmentCategory }
})
```

This runs in the background -- the applicant's redirect to the thank-you page is never delayed even if the email fails.

---

## Technical Details

| File | Change |
|---|---|
| `supabase/functions/send-scheduled-report/index.ts` | Fix "from" to `reports@oknextgen.com` |
| `supabase/functions/send-weekly-digest/index.ts` | Fix "from" to `reports@oknextgen.com` |
| `supabase/functions/notify-new-application/index.ts` | New -- emails 3 recipients on new application |
| `supabase/config.toml` | Add `notify-new-application` entry |
| `src/pages/apply/JobApplication.tsx` | Call notification function after successful insert |

