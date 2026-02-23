

# Fix Welcome Modal Notifications, Align Rep/Admin Lead Views, Add Cancelled Status

## Three Changes

### 1. Fix "New Lead Assigned" Notification

**Problem**: The Welcome Modal shows "New Lead Assigned" for leads like Russ Pace even though the lead is already in "scheduled" status. The query at line ~314 of `WelcomeModal.tsx` fetches leads by `assigned_at` date but does NOT filter out leads that have progressed past "new" status.

**Fix**: Add a status filter to the new leads query so it only shows leads still in "new" status. Once a rep changes a lead to "contacted" or beyond, it should no longer appear as a "New Lead Assigned" notification.

**File**: `src/components/dashboard/WelcomeModal.tsx`
- Add `.eq('status', 'new')` to the new leads query (around line 316)

---

### 2. Align Rep Lead Detail View with Admin Layout

**Problem**: The rep view (`LeadDetailView.tsx`) has a different section order than the admin view (`LeadDetail.tsx`). The rep view currently has:
- Left: Service Details, Contact Info, Photos, Files, Documents, Activity Log
- Right: Quote, Scheduling/Payments, Follow-up, Timeline (with Won/Lost buttons)

**Fix**: Restructure the rep view to match the admin's chronological lifecycle order, keeping admin-only sections hidden but maintaining the same flow. The rep view will get:
- Left column: Service Details, Contact Info, Photos, Saved Estimates (Past Estimates)
- Right column: Follow-up, Quote, Outcome (Won/Lost/Cancelled as standalone card), Scheduling/Payments, Timeline (dates only), Files, Activity Log

The header section (with document action buttons like View Appointment, View Checklist, Create Contract, etc.) stays at the top -- this is rep-specific and the admin should also get these action buttons added to their view.

**File**: `src/pages/dashboard/LeadDetailView.tsx`
- Move Files and Activity Log from left to right column
- Move Documents section into left column or remove (redundant with action buttons)
- Extract Won/Lost from Timeline into standalone Outcome card
- Reorder right column: Follow-up, Quote, Outcome, Scheduling/Payments, Timeline (dates only)

**File**: `src/pages/admin/LeadDetail.tsx`
- Add the document action buttons row (View Appointment, View Checklist, Create Contract, Flex Schedule Form) to the admin header area, matching the rep view

---

### 3. Add "Cancelled" Option to Outcome Section

**Problem**: Currently only "Won" and "Lost" buttons exist. The user wants a "Cancelled" option that requires a cancellation reason.

**Fix**: Add a "Cancelled" button alongside Won and Lost in the Outcome card on both admin and rep views. When clicked, it requires selecting a cancellation reason before proceeding. This will use the existing `status` field with a new value "cancelled".

**Database**: Add "cancelled" as a valid status. Check if a migration is needed (the status column appears to be a text field without constraints, so no migration needed -- just add it to the UI options).

**Both files** (`LeadDetail.tsx` and `LeadDetailView.tsx`):
- Add "cancelled" to `statusOptions` array
- Add a "Cancelled" button in the Outcome card (amber/orange styled)
- Require a cancellation reason (dropdown with options like: "Customer changed mind", "Financing fell through", "Insurance denied", "Scheduling conflict", "Material unavailable", "Other")
- Store reason in `lost_reason` field (reuse existing column) or a new `cancelled_reason` field
- Display cancelled state with date and reason when status is "cancelled"

**Database migration**: Add `cancelled_at` and `cancelled_reason` columns to `quote_requests` table for clean data separation from lost leads.

---

## Summary of Files Modified

| File | Changes |
|------|---------|
| `src/components/dashboard/WelcomeModal.tsx` | Add `.eq('status', 'new')` filter to new leads query |
| `src/pages/dashboard/LeadDetailView.tsx` | Reorder to match admin lifecycle layout; extract Won/Lost/Cancelled into Outcome card; move Files and Activity Log to right column |
| `src/pages/admin/LeadDetail.tsx` | Add document action buttons row; add Cancelled button to Outcome card; add "cancelled" to status options |
| Database migration | Add `cancelled_at` (timestamptz) and `cancelled_reason` (text) columns to `quote_requests` |

## Technical Details

**Cancellation reasons dropdown options:**
- Customer changed mind
- Financing fell through
- Insurance denied
- Scheduling conflict
- Material unavailable
- Weather delay
- Other

**Cancelled button behavior:**
- Appears alongside Won and Lost in the Outcome card
- Styled with amber/orange color scheme
- Clicking without a reason selected shows a toast: "Please select a cancellation reason first"
- On cancel: sets `status = 'cancelled'`, `cancelled_at = now()`, `cancelled_reason = selected reason`
- Logs a status_change activity in lead_activity_log

**WelcomeModal filter logic:**
- "New Lead Assigned" only shows leads where `status = 'new'` AND `assigned_at >= referenceSince`
- Once a lead moves to "contacted" or any other status, it disappears from this notification section
- Other notification sections (overdue follow-ups, open leads) already correctly filter out progressed leads

