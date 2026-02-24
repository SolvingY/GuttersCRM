
# Lead Detail Enhancements

## Summary of All Changes

### 1. Move Sections to Right Column (Updated Order)
In both admin (`LeadDetail.tsx`) and rep (`LeadDetailView.tsx`) views, move **Saved Estimates**, **Scheduling / Payments**, and **Files** from the left column to the right column. Updated order:

**Right column (top to bottom):**
1. Assignment (admin only)
2. Outcome
3. Follow-up
4. Saved Estimates
5. Scheduling / Payments
6. Quote Approval
7. **Files** (below Quote Approval as requested)
8. Timeline
9. Archive (admin only)
10. Activity Log
11. Admin Notes (admin only)

### 2. Combine "Service Details" + "Contact Information"
Merge these two collapsible sections into one called **"Service / Client Details"**. The combined section shows the form data (service details) first, followed by a separator, then the contact info (email, phone, address, contact time, referral source). Applies to both admin and rep views.

### 3. Fix "Won then Scheduled" Status Bug
When status changes to "scheduled" via the dropdown, preserve the `won_at` timestamp. If `won_at` isn't already set, set it automatically (since scheduled implies won). This prevents the "Won" status from being visually unchecked when progressing to "Schedule."

### 4. Send Assignment Email to Assigned Rep
Update the `notify-lead-assigned` edge function to accept an optional `assignedRepEmail` field. If provided, add the rep's email to the recipient list. Update the admin `LeadDetail.tsx` to look up the rep's email from the `profiles` table when assigning and pass it to the function. The email body will include a note prompting the rep to log in to their dashboard.

### 5. Fix Contract Signed Badge Position
In the rep view (`LeadDetailView.tsx`), the contract button wraps the button and badges in a `<div>`, causing the signed badge to appear outside the button box. Restructure so badges are inside the `<Button>` component, matching the pattern used by other document buttons.

### 6. Conditional Document Buttons Based on Service Type
- **Schedule Appointment**: For residential roofing leads, the button label says "Schedule Roofing Consultation" instead of "Schedule Appointment" (gutter-focused)
- **20-Point Checklist**: Only show for gutter leads (`service_type === "gutters"`), hide for residential/commercial/repair leads
- **Appointment Sheet Form**: When opened for a residential roofing lead, show roofing-relevant consultation services instead of gutter inspection services

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/LeadDetail.tsx` | 1) Remove Saved Estimates, Scheduling/Payments, Files from left column (lines 412-428). 2) Insert Saved Estimates and Scheduling/Payments after Follow-up in right column, Files after Quote Approval. 3) Merge Service Details + Contact Info into single "Service / Client Details" section. 4) Add `won_at` preservation when status changes to "scheduled". 5) Fix contract badge to be inside button. 6) Conditionally show 20-point checklist only for gutters. 7) Change appointment label for roofing leads. 8) Look up rep email from profiles on assignment and pass to edge function. |
| `src/pages/dashboard/LeadDetailView.tsx` | 1) Remove Saved Estimates, Scheduling/Payments, Files from left column (lines 360-395). 2) Insert into right column with Files after Quote Approval. 3) Merge Service Details + Contact Info. 4) Add `won_at` preservation for "scheduled" status. 5) Fix contract badge (move badges inside button). 6) Conditional checklist/appointment labels. |
| `supabase/functions/notify-lead-assigned/index.ts` | Accept optional `assignedRepEmail`. If present, add to TO list. Add a line in the email body for the rep: "You have been assigned this lead. Please log in to your dashboard to review it." with a link to the rep dashboard. |
| `src/pages/dashboard/forms/AppointmentSheet.tsx` | Accept service type from location state. When service type is residential/commercial/repair, show roofing consultation services instead of gutter inspection services. Update the title to "Schedule a Roofing Consultation" for roofing leads vs "Schedule a Gutter Consultation" for gutter leads. |

### Status Fix Logic

In the status dropdown `onValueChange` handler, add:
```text
if (v === "scheduled") {
  if (!lead.won_at) updates.won_at = new Date().toISOString();
}
```
This ensures "won" is always set before or when "scheduled" is selected.

### Rep Email Lookup

When assigning a lead in the admin view, after finding the rep from `salesReps`, query `profiles` for their email:
```text
const { data: profile } = await supabase
  .from("profiles")
  .select("email")
  .eq("id", v)
  .single();
```
Then pass `assignedRepEmail: profile?.email` to the edge function.

### Conditional Document Buttons

```text
const isGutters = lead.service_type === "gutters";
const showInspection = isGutters;  // Only show 20-point checklist for gutters
const appointmentLabel = isGutters ? "Schedule Appointment" : "Schedule Roofing Consultation";
```

### Appointment Sheet Service-Aware Content

Pass `lead.service_type` through location state. In `AppointmentSheet.tsx`, conditionally render:
- Gutters: Current gutter inspection services list
- Roofing: "Full Roof Inspection", "Shingle & Material Assessment", "Storm Damage Evaluation", "Custom Quote/Estimate"
- Title: "Schedule a Gutter Consultation" vs "Schedule a Roofing Consultation"
