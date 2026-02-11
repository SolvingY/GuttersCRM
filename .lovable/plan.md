

## Add Persistent Open Leads Follow-up Prompt

### Overview

Currently the Welcome Modal shows only *overdue* follow-ups and *newly assigned* leads. The request is to always prompt sales reps about **all open leads** (any lead not in "won" or "lost" status) so they are reminded to follow up every time they log in until the lead is closed out.

### Changes (1 file)

**`src/components/dashboard/WelcomeModal.tsx`**

1. **Add new state**: `openLeads` -- all leads assigned to the user where status is not "won" or "lost"

2. **Add new query** in `fetchData`:
   - Query `quote_requests` where `assigned_to = user.id` and `status NOT IN ('won', 'lost')`
   - Select `id, full_name, service_type, status, priority, next_followup_due, assigned_at`
   - Order by priority (urgent first), then by `next_followup_due` ascending (most overdue first)
   - Limit to 10

3. **Add new UI section** titled "Open Leads - Action Required" placed prominently above the existing lead notifications section:
   - Amber/yellow card with a persistent reminder message: "You have X open leads. Follow up to close them out!"
   - Each lead shown as a clickable row with:
     - Lead name (links to `/dashboard/leads/:id`)
     - Current status badge (color-coded: new=blue, contacted=yellow, quoted=purple, scheduled=green)
     - Follow-up indicator (overdue=red dot, due today=yellow dot, upcoming=gray)
     - Service type
   - Priority leads (urgent/high) shown at the top with badges

4. **Update `hasLeadNotifications`** to also include `openLeads.length > 0`, ensuring the "View My Leads" button appears whenever there are open leads

5. **Remove redundancy**: The existing "Overdue Follow-ups" section will remain since it highlights urgency separately, but the open leads section gives the full picture of their pipeline

### No database changes needed

All data is already queryable via existing RLS policies on `quote_requests` (assigned reps can view their own leads).

