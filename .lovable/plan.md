

# Internet Lead Notifications, Layout Restructure, Follow-up Logic, and Status Order Fix

## Summary
Five changes across a new backend function, two frontend files, and a database trigger update.

---

## 1. New Backend Function: `notify-new-lead`

Create `supabase/functions/notify-new-lead/index.ts` that sends an HTML email notification to the team whenever a new internet lead is submitted through the public quote form.

**Recipients:**
- j.whitton@oknextgen.com
- k.jameson@oknextgen.com
- a.Whisman@oknextgen.com
- adam@grateful-services.com

**Email content:** Lead name, service type, phone, email, address, reference number, and a link to the admin lead detail page.

**Triggered from:** `src/pages/GetQuote.tsx` -- add a second function call (alongside the existing `send-quote-email`) after successful submission.

**Verification:** After deployment, invoke the function with the most recent lead to confirm all four recipients get the email.

---

## 2. Lead Detail Layout Changes (Both Admin and Rep Views)

### Admin (`src/pages/admin/LeadDetail.tsx`) -- Right column reorder:
1. Assignment (stays)
2. **Outcome** (moved up from position 4)
3. **Follow-up** (moved down from position 2)
4. Quote Approval
5. Timeline
6. Archive
7. Activity Log
8. Admin Notes

### Rep (`src/pages/dashboard/LeadDetailView.tsx`) -- Right column reorder:
1. **Outcome** (moved up from position 3)
2. **Follow-up** (moved down from position 1)
3. Quote Approval
4. Timeline
5. Activity Log

---

## 3. All Sections Start Collapsed

Change all `CollapsibleSection` instances in both lead detail views from `defaultOpen` or `defaultOpen={true}` to `defaultOpen={false}`, so every section starts retracted when opening a lead.

---

## 4. Fix Status Dropdown Order

Both files currently have incorrect status ordering. Update to the correct lifecycle order:

**New order:** `new`, `contacted`, `quoted`, `won`, `scheduled`, `completed`, `lost`, `cancelled`

---

## 5. Stop Follow-up Reminders After "Won"

### Database trigger update
Modify the `set_followup_on_update` function to clear `next_followup_due` when a lead reaches terminal/post-win statuses (`won`, `scheduled`, `completed`, `lost`, `cancelled`). This stops the 24-hour follow-up cycle once a deal is won.

### Frontend update
In `handleLogFollowup` in both files, only set the next 24-hour follow-up if the lead status is NOT in `won`, `scheduled`, `completed`, `lost`, or `cancelled`. For won+ leads, just log the follow-up without scheduling another one.

---

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/notify-new-lead/index.ts` | Edge function to email 4 team members on new internet leads |

### Files to Modify
| File | Changes |
|------|---------|
| `src/pages/GetQuote.tsx` | Add `notify-new-lead` invocation after successful submission |
| `src/pages/admin/LeadDetail.tsx` | Reorder right column sections, set all `defaultOpen={false}`, fix `statusOptions` order, update `handleLogFollowup` |
| `src/pages/dashboard/LeadDetailView.tsx` | Reorder right column sections, set all `defaultOpen={false}`, fix `statusOptions` order, update `handleLogFollowup` |
| `supabase/config.toml` | Add `notify-new-lead` function config |

### Database Migration
| Change | Details |
|--------|---------|
| Update `set_followup_on_update` trigger | Clear `next_followup_due` when status changes to `won`, `scheduled`, `completed`, `lost`, or `cancelled` |

### Post-Deploy Verification
Invoke `notify-new-lead` with the most recent internet lead to confirm all 4 recipients receive the notification email.

