

## Sales Rep Lead Detail View + Auto-Assignment Fixes

### Overview

Three issues to address:
1. Sales reps clicking leads in "My Leads" are sent to `/admin/leads/:id` which they cannot access
2. Auto-assignment should only target sales reps (users in `user_metrics`), not canvassers
3. Admin assignment dropdown should also filter to sales reps only

### Key Clarification: No `role_type` column exists

The `user_metrics` table does not have a `role_type` column. However, the existing architecture already separates the two: sales reps have entries in `user_metrics`, canvassers have entries in `canvasser_metrics`. Combined with `user_roles.role = 'user'`, we can reliably identify sales reps by joining `user_roles` (role='user') with `user_metrics` (has an entry). No schema changes needed for this distinction.

---

### 1. New File: `src/pages/dashboard/LeadDetailView.tsx`

A simplified version of the admin `LeadDetail.tsx` for sales reps, rendered inside the dashboard layout at `/dashboard/leads/:id`.

**Can do:**
- View full lead details, contact info, photos, timeline
- Change status (new, contacted, quoted, scheduled, won, lost)
- Enter quote amount and submit for approval
- Log activities (notes, calls, emails, follow-ups)
- View quote approval/rejection status
- Mark follow-ups complete, snooze

**Cannot do (hidden/removed):**
- Reassign lead (no assignment section)
- Change priority (no priority dropdown)
- Delete lead
- Approve/reject quotes (submit only)
- Edit admin notes section

The component queries `quote_requests` filtered by `assigned_to = auth.uid()` via existing RLS, so unauthorized access returns "not found."

---

### 2. Modified Files

**`src/App.tsx`**
- Add import for `LeadDetailView`
- Add route `<Route path="leads/:id" element={<LeadDetailView />} />` inside the dashboard route group (line 74, after `my-leads`)

**`src/pages/dashboard/MyLeads.tsx`**
- Change link target from `/admin/leads/${lead.id}` to `/dashboard/leads/${lead.id}` (line 104)

**`src/pages/admin/LeadDetail.tsx`**
- Update the sales reps query (line 58-65) to join `user_roles` to filter only users with `role = 'user'`, ensuring canvassers are excluded from the assignment dropdown

---

### 3. Database Migration

Update the `auto_assign_lead()` function to also join with `user_metrics` to ensure only users who have a `user_metrics` entry (i.e., actual sales reps) are eligible. The current function already filters by `user_roles.role = 'user'`, but adding the `user_metrics` join provides a second layer of confirmation and access to `closed_deals`/`leads` for ranking logic.

The updated function will use:
```text
FROM user_roles ur
LEFT JOIN user_metrics um ON um.user_id = ur.user_id
WHERE ur.role = 'user'
```

This naturally excludes canvasser-only users since they only have entries in `canvasser_metrics`, not `user_metrics`.

---

### File Summary

| Action | File | Changes |
|--------|------|---------|
| Create | `src/pages/dashboard/LeadDetailView.tsx` | Sales rep lead detail with limited permissions |
| Modify | `src/App.tsx` | Add `/dashboard/leads/:id` route |
| Modify | `src/pages/dashboard/MyLeads.tsx` | Fix link from `/admin/leads/` to `/dashboard/leads/` |
| Modify | `src/pages/admin/LeadDetail.tsx` | Filter assignment dropdown to sales reps only |
| Migration | Database | Update `auto_assign_lead()` to join `user_metrics` |

