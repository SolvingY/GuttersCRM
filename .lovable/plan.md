

# Fix: Canvasser Lead — Name Display, Metrics Sync, and Email Notification

## Changes

### 1. Show canvasser name on lead cards and lead detail

**`src/pages/admin/Leads.tsx`** (lead cards in main list, ~line 180):
- Query `profiles` for canvasser names (using `canvasser_id` from `quote_requests`)
- Below the client name on canvasser-type leads, show "Set by: {canvasser name}" in muted text

**`src/pages/admin/LeadDetail.tsx`** (header area, ~line 338):
- Fetch profile for `lead.canvasser_id` when it exists
- Display "Set by: {canvasser name}" below the reference number line for canvasser leads

### 2. Client details at top + formatting (approved items)

**`src/pages/admin/LeadDetail.tsx`**:
- Change `defaultOpen={false}` to `defaultOpen={true}` on Service / Client Details section (line 452)
- Move contact info block (email, phone, address) ABOVE `renderFormData()` so it's the first thing visible
- Standardize label widths to `min-w-[160px]`

### 3. Send notification email when canvasser creates a lead

**`src/pages/canvasser/CreateCanvasserLead.tsx`** (~line 265, after `increment_canvasser_lead_set`):
- Call `notify-new-lead` edge function with the lead data (clientName, phone, email, address, serviceType, referenceNumber, leadId, formData)
- Wrap in try/catch so email failure doesn't block submission
- Fetch the created lead's `reference_number` from the insert response (add `reference_number` to `.select()`)

### 4. Add "New Canvasser Lead" notification type to routing

**`src/pages/admin/NotificationRouting.tsx`** (line 16-21):
- Add entry: `{ key: 'new_canvasser_lead', label: 'New Canvasser Leads', description: 'When a canvasser submits a new lead' }`

**`supabase/functions/notify-new-lead/index.ts`**:
- Update to check for both `new_lead` and `new_canvasser_lead` notification types based on a `leadSource` parameter
- When `leadSource === 'canvasser'`, query `notification_routing` for `new_canvasser_lead` type, falling back to `new_lead` recipients
- Update email subject to distinguish: "🏠 New Canvasser Lead: {name}" vs "🏠 New Internet Lead: {name}"
- Include canvasser name in the email body

### 5. Canvasser lead counter already works

The form already calls `increment_canvasser_lead_set` (line 267) which updates `canvasser_metrics`, `weekly_canvasser_metrics`, and `daily_canvasser_metric_entries`. This feeds into the time clock display and weekly updates. No change needed here — this is already working correctly.

## Files Changed
- `src/pages/admin/LeadDetail.tsx` — canvasser name display, defaultOpen, contact info reorder, formatting
- `src/pages/admin/Leads.tsx` — canvasser name on lead cards
- `src/pages/canvasser/CreateCanvasserLead.tsx` — invoke notify-new-lead after submission
- `src/pages/admin/NotificationRouting.tsx` — add new_canvasser_lead type
- `supabase/functions/notify-new-lead/index.ts` — support canvasser lead source, include canvasser name

