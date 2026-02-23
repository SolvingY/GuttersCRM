

# Inspection Checklist UI Parity, Email on Submit, Roofing Support, and Universal Scheduling

## Overview

Four interconnected changes to make the inspection checklist consistent across portals, add roofing as a service option, enable email delivery of forms on submit, and make scheduling universal.

---

## Change 1: Match Inspection Checklist UI (Rep View = Canvasser View)

**Problem:** The rep's standalone `InspectionChecklist.tsx` uses a basic three-state emoji toggle, while the canvasser's inline version uses Yes/No buttons with proper styling.

**Fix in `src/pages/dashboard/forms/InspectionChecklist.tsx`:**

- Replace the emoji-based tri-state toggle with the canvasser's Yes/No button pattern (green "Yes" / red "No" buttons per item)
- Add the customer/address/date header block at the top (like the canvasser version)
- Add the "Pre-existing conditions" and "Safety concerns" text areas (the canvasser has these, the rep version does not)
- Add the "WE CAN ALL AGREE SOMETHING NEEDS TO BE DONE RIGHT?" closing line
- Keep the same data structure so existing saved checklists still load correctly

---

## Change 2: Add Roofing as a Service Interest Option

**Problem:** The canvasser's "Service Interest" dropdown only has Gutters, Protection, Both, and Other. Roofing is missing.

**Fix in `src/pages/canvasser/CreateCanvasserLead.tsx`:**

- Add `<SelectItem value="roofing">Roofing</SelectItem>` and `<SelectItem value="roofing_gutters">Roofing & Gutters</SelectItem>` to the Service Interest dropdown (line ~253)
- When `serviceInterest` is `"roofing"`, hide the gutter-specific sections of the inspection checklist (Gutter Conditions, Inside Gutter items) but keep Perimeter Inspection since that applies to all services
- The rep's `InspectionChecklist.tsx` should also conditionally hide gutter sections when the lead's `service_type` is `"residential"` or `"commercial"` (roofing types)

---

## Change 3: Email Checklist and Appointment to Homeowner on Submit

**Problem:** When the canvasser submits a lead, there's no option to email the inspection results and appointment details to the homeowner.

**Fix:**

1. **Add a "Send to Homeowner" checkbox** in `CreateCanvasserLead.tsx` near the Submit button (visible when email is filled in and checklist or appointment is touched)

2. **Create a new edge function** `supabase/functions/send-inspection-email/index.ts` that:
   - Accepts: `clientName`, `clientEmail`, `address`, `appointmentDate`, `appointmentTime`, `inspectionData` (conditions, perimeter, inside checks), `serviceInterest`
   - Generates an HTML email with the checklist results formatted as a report and the appointment details
   - Sends via Resend API using `notifications@oknextgen.com` sender
   - Uses the same email styling pattern as `send-install-confirmation`

3. **Call the edge function** from `CreateCanvasserLead.tsx` after successful lead submission if the "Send to Homeowner" checkbox is checked

---

## Change 4: Universal Appointment/Scheduling Form

**Problem:** The appointment scheduling is only available inline in the canvasser's create-lead flow. It should also be available as a standalone form (like contract, flex schedule, warranty) that reps and admins can create from the lead detail view.

**Fix:**

1. **Create `src/pages/dashboard/forms/AppointmentSheet.tsx`** as a standalone form page:
   - Same fields as the canvasser inline version: date, time, rep notes
   - Includes the "What's included with every consultation" and "Why Choose Next Gen" sections
   - Saves to `lead_forms` with `form_type: "appointment"`
   - Loads existing appointment form data if editing

2. **Register the route** in `src/App.tsx`: `/dashboard/leads/:id/appointment`

3. **Add an "Appointment" button** in `LeadDetailView.tsx` document action buttons section (alongside Contract, Flex Schedule, etc.) -- always visible for any lead status

---

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/send-inspection-email/index.ts` | Edge function to email checklist + appointment to homeowner |
| `src/pages/dashboard/forms/AppointmentSheet.tsx` | Standalone appointment/scheduling form for reps and admins |

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/dashboard/forms/InspectionChecklist.tsx` | Rewrite UI to match canvasser's Yes/No button pattern; add pre-existing/safety fields; conditionally hide gutter sections for roofing leads |
| `src/pages/canvasser/CreateCanvasserLead.tsx` | Add roofing service options; conditionally hide gutter checklist sections for roofing; add "Send to Homeowner" email checkbox |
| `src/pages/dashboard/LeadDetailView.tsx` | Add Appointment Sheet button to document actions |
| `src/App.tsx` | Register `/dashboard/leads/:id/appointment` route |

### Conditional Logic for Roofing vs Gutters
- If `serviceInterest` / `service_type` is `roofing`, `residential`, or `commercial`: hide "Gutter Conditions" and "Inside Gutter" sections from the checklist, keep "Perimeter Inspection"
- If `gutters`, `protection`, `both`, or `roofing_gutters`: show all checklist sections

