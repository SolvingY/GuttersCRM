

# Auto Clock-Out, Supervisor Email, and Notification Routing Manager

## Overview

Three related changes:
1. Reduce the auto-flag/auto-clock-out threshold from 12 hours to 4 hours, and automatically close the shift (not just flag it)
2. Send an email to supervisors (m.fowler@oknextgen.com and j.whitton@oknextgen.com) when a shift is auto-closed
3. Create a new **Notification Routing** admin page under HR Management where admins can manage which email addresses receive each type of notification -- replacing all hardcoded recipient lists

---

## Step 1: Database -- `notification_routing` Table

Create a new table to store email routing rules:

```sql
CREATE TABLE public.notification_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  email text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (notification_type, email)
);

ALTER TABLE public.notification_routing ENABLE ROW LEVEL SECURITY;

-- Admins can read and manage
CREATE POLICY "Admins can manage notification routing"
  ON public.notification_routing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

Seed with current hardcoded recipients:

| notification_type | email |
|---|---|
| `new_application` | m.fowler@oknextgen.com, j.whitton@oknextgen.com, k.jameson@oknextgen.com |
| `new_lead` | j.whitton@oknextgen.com, k.jameson@oknextgen.com, a.Whisman@oknextgen.com |
| `lead_assigned` | j.whitton@oknextgen.com, k.jameson@oknextgen.com, a.Whisman@oknextgen.com |
| `flagged_shift` | m.fowler@oknextgen.com, j.whitton@oknextgen.com |
| `auto_clockout` | m.fowler@oknextgen.com, j.whitton@oknextgen.com |
| `weekly_report` | (managed via existing report_settings -- listed here for visibility but pulled from report_settings) |

---

## Step 2: Auto Clock-Out at 4 Hours

**File: `src/components/canvasser/TimeClockWidget.tsx`**

Change the threshold from 12 hours to 4 hours (line 94). Instead of just flagging the shift, auto-close it:
- Calculate hours worked (capped at 4h)
- Update the shift record with `clock_out_at`, `status: 'auto_closed'`, and `flagged_reason`
- Call `updateCanvasserHours()` with the calculated hours (no doors/convos since canvasser didn't submit)
- Invoke a new edge function `notify-auto-clockout` to email supervisors
- Show the canvasser a toast explaining their shift was auto-closed

---

## Step 3: New Edge Function `notify-auto-clockout`

**File: `supabase/functions/notify-auto-clockout/index.ts`**

This function:
1. Receives `canvasserId`, `canvasserName`, `clockInAt`, `hoursWorked`
2. Queries `notification_routing` for `notification_type = 'auto_clockout'` to get recipient emails
3. Falls back to `flagged_shift` recipients if none configured
4. Sends a styled email to supervisors explaining the auto clock-out
5. Subject: "Auto Clock-Out -- [Canvasser Name]"

---

## Step 4: Update Existing Edge Functions to Use `notification_routing`

Update these edge functions to query `notification_routing` instead of using hardcoded `RECIPIENTS` arrays:

| Edge Function | notification_type key |
|---|---|
| `notify-new-application` | `new_application` |
| `notify-new-lead` | `new_lead` |
| `notify-lead-assigned` | `lead_assigned` |
| `notify-flagged-shift` | `flagged_shift` |

Each function will:
1. Query `notification_routing` where `notification_type = X` and `is_active = true`
2. Use those emails as recipients
3. Fall back to the existing hardcoded list if no routing entries found (safety net)

---

## Step 5: Notification Routing Admin Page

**New file: `src/pages/admin/NotificationRouting.tsx`**

A full management page showing a table of all notification types with their recipients. Features:
- Grouped by notification type with friendly labels (e.g., "New Applications", "New Internet Leads", "Lead Assignments", "Flagged Shifts", "Auto Clock-Out")
- Each group shows active email recipients as badges
- "Add Email" button per group opens an input to add a new recipient
- Delete button (X) on each badge to remove a recipient
- Toggle switch per recipient to enable/disable without deleting
- Save happens immediately on add/remove (no separate save button)

---

## Step 6: Wire Up Route and Navigation

**File: `src/App.tsx`**
- Import `NotificationRouting` and add route: `<Route path="notifications" element={<NotificationRouting />} />`

**File: `src/pages/admin/AdminLayout.tsx`**
- Add to HR Management group: `{ icon: Mail, label: 'Notifications', path: '/admin/notifications' }`
- Import `Mail` from lucide-react

---

## Files Summary

| Action | File |
|--------|------|
| Migration | Create `notification_routing` table + seed data |
| Create | `supabase/functions/notify-auto-clockout/index.ts` |
| Modify | `src/components/canvasser/TimeClockWidget.tsx` -- 4hr auto clock-out logic |
| Modify | `supabase/functions/notify-new-application/index.ts` -- use routing table |
| Modify | `supabase/functions/notify-new-lead/index.ts` -- use routing table |
| Modify | `supabase/functions/notify-lead-assigned/index.ts` -- use routing table |
| Modify | `supabase/functions/notify-flagged-shift/index.ts` -- use routing table |
| Create | `src/pages/admin/NotificationRouting.tsx` |
| Modify | `src/App.tsx` -- add route |
| Modify | `src/pages/admin/AdminLayout.tsx` -- add nav item |

---

## Technical Notes

- The `notification_routing` table uses a composite unique on `(notification_type, email)` to prevent duplicates
- Edge functions use `SUPABASE_SERVICE_ROLE_KEY` to query `notification_routing` (bypassing RLS) since they run server-side
- Auto clock-out status is `'auto_closed'` (distinct from `'completed'` and `'flagged'`) so admins can filter and identify these shifts
- The canvasser's TimeClockWidget checks shift age on every `fetchShifts()` call (page load / navigation), so auto clock-out triggers on their next visit
- Weekly report routing remains in `report_settings` since it already has a management UI; it will be listed on the Notification Routing page as a link to Report Settings for convenience

