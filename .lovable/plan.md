

## Phase 2: Advanced Lead Management - Implementation Plan

### Answers to Your Questions

**1. User Metrics Table:** `user_metrics` lacks `active_leads`, `total_leads_assigned`, `close_rate`. Instead of creating a separate `sales_rep_stats` table, we will compute these dynamically: active leads = `COUNT` of `quote_requests` assigned to that user with open status; close rate = `closed_deals / NULLIF(leads, 0)` from `user_metrics`. This avoids data duplication and sync issues.

**2. Sales Rep Identification:** Already solved by the existing role system. The `user_roles` table has role `'user'` for sales reps. Auto-assignment will query users with the `'user'` role. No new columns or role types needed.

**3. Follow-up auto-setting:** Yes, included as a trigger.

**4. Quote approval notifications:** Yes, included. We will use the `lead_activity_log` table to record these events (since there is no `client_notifications` table in the database). Admins see pending approvals via the leads dashboard filters; sales reps see activity on their assigned leads.

**5. Activity log RLS:** Confirmed, using the exact pattern you described.

**6. Ranking logic:** Will use `closed_deals / NULLIF(leads, 0) DESC, active_lead_count ASC` directly in the auto-assign function.

---

### 1. Database Migration

**Fix RLS bug - new function:**

`submit_quote_request(...)` - SECURITY DEFINER function that accepts all form fields, performs the INSERT, and returns the reference_number. This bypasses the SELECT RLS restriction for anonymous users.

**New table: `auto_assignment_settings`**
- id (UUID PK), enabled (boolean default false), assignment_method (text default 'round_robin'), max_leads_per_rep (integer default 10), updated_at, updated_by (UUID)
- RLS: Admin-only for all operations
- Pre-populated with one default row

**New table: `lead_activity_log`**
- id (UUID PK), lead_id (UUID references quote_requests), user_id (UUID), activity_type (text), content (text), created_at (timestamptz default now())
- Activity types: 'note', 'call', 'email', 'status_change', 'assignment', 'followup', 'quote_submitted', 'quote_approved', 'quote_rejected'
- RLS: Admins can do all operations; sales reps can INSERT and SELECT only on leads assigned to them

**Add columns to `quote_requests`:**
- quote_status (text, nullable) - null / 'pending_approval' / 'approved' / 'rejected'
- quote_submitted_by (UUID)
- quote_submitted_at (timestamptz)
- quote_rejected_reason (text)

**New database functions:**
- `auto_assign_lead()` - SECURITY DEFINER trigger function. Checks `auto_assignment_settings`, finds eligible sales reps (role = 'user'), counts their active leads from `quote_requests`, assigns based on method.
- `set_followup_on_update()` - trigger function that sets `next_followup_due` to NOW() + 24 hours when `assigned_to` or `status` changes to 'contacted'.
- `log_status_change()` - trigger that auto-logs status changes to `lead_activity_log`.

**New triggers:**
- `auto_assign_on_insert` - AFTER INSERT on `quote_requests`, calls auto-assign logic
- `set_followup_on_assignment_or_contact` - BEFORE UPDATE on `quote_requests`, sets follow-up due date
- `log_quote_status_change` - AFTER UPDATE on `quote_requests`, logs status/assignment changes

---

### 2. New Files

| File | Purpose |
|------|---------|
| `src/components/admin/AutoAssignmentSettings.tsx` | Collapsible settings panel: enable/disable toggle, method dropdown (Round Robin / Ranking Based / Workload Based), max leads per rep input |
| `src/components/admin/QuoteApprovalSection.tsx` | In lead detail: quote amount input, "Submit for Approval" button, admin approve/reject buttons with rejection reason textarea |
| `src/components/admin/LeadActivityLog.tsx` | Timeline of all lead activities with a form to add new entries (note/call/email/followup types) |
| `src/components/admin/LeadExportButton.tsx` | CSV export button using installed `xlsx` library |
| `src/pages/dashboard/MyLeads.tsx` | Sales rep view: their assigned leads with status filters and click-through to detail |

---

### 3. Modified Files

**`src/pages/GetQuote.tsx`**
- Replace `.insert().select()` with `supabase.rpc('submit_quote_request', {...})` to fix the RLS error

**`src/pages/admin/Leads.tsx`**
- Add AutoAssignmentSettings as collapsible section
- Add LeadExportButton in header
- Add "Assigned to" filter dropdown (All / Unassigned / specific rep names)
- Add date range filter
- Add follow-up indicators on lead cards (overdue in red, due today in yellow)

**`src/pages/admin/LeadDetail.tsx`**
- Add QuoteApprovalSection component
- Add LeadActivityLog component
- Add follow-up tracking: next follow-up date display, "Log Follow-up" button, "Snooze 24h" button
- Show quote_status badge in header area

**`src/App.tsx`**
- Add route `/dashboard/my-leads` for sales rep leads view

**`src/pages/dashboard/DashboardLayout.tsx`**
- Add "My Leads" nav item (ClipboardList icon) visible to users with the 'user' role

---

### 4. Feature Details

**Auto-Assignment Logic (database function):**
- Checks if enabled in `auto_assignment_settings`
- Queries all users with role 'user' from `user_roles`
- Counts each rep's active leads (`status NOT IN ('won', 'lost')`) from `quote_requests`
- Filters out reps at max capacity
- Round Robin: assign to rep with fewest active leads
- Ranking Based: assign to rep with highest close rate (`closed_deals / NULLIF(leads, 0)` from `user_metrics`), breaking ties by fewest active leads
- Workload Based: assign to rep with fewest active leads, breaking ties by close rate
- Updates `assigned_to`, `assigned_at` on the lead
- Logs assignment in `lead_activity_log`

**Quote Approval Flow:**
1. Sales rep enters amount, clicks "Submit for Approval"
2. Sets `quote_amount`, `quote_status = 'pending_approval'`, `quote_submitted_by`, `quote_submitted_at`
3. Activity logged: "Quote of $X submitted for approval"
4. Admin sees pending indicator on lead card in list view
5. Admin clicks Approve: sets `quote_status = 'approved'`, `quote_approved = true`, `quote_approved_by`, `quote_approved_at`; activity logged
6. Admin clicks Reject: sets `quote_status = 'rejected'`, `quote_rejected_reason`; activity logged
7. After approval, "Send Quote to Client" button appears (uses existing `send-quote-email` edge function with quote amount included)

**Follow-Up Tracking:**
- Trigger auto-sets `next_followup_due` = NOW() + 24h when lead is assigned or status changes to 'contacted'
- Lead cards show: overdue (red clock icon), due today (yellow), upcoming (gray)
- "Log Follow-up" button: saves note to `lead_activity_log`, resets `next_followup_due` to +24h, increments `followup_count`
- "Snooze" button: pushes `next_followup_due` by 24 hours without logging

**CSV Export columns:**
Reference Number, Date Submitted, Service Type, Name, Email, Phone, Address, City, State, Zip, Status, Priority, Assigned To, Quote Amount, Quote Status, Referral Source, Follow-up Count

**My Leads (Sales Rep View):**
- Filtered to `assigned_to = current user` only
- Status and priority filters
- Lead cards identical to admin view but without assignment dropdown
- Click through to LeadDetail with limited permissions: can change status, log activities, submit quotes for approval, but cannot reassign, change priority, or delete

