
# Fix Self-Gen Lead Type Display and Metrics Adjustment on Type Change

## Problem

Two issues exist:

1. The admin Leads list page (`Leads.tsx`) only renders two badge variants: "Canvasser" (purple) and "Internet" (blue). When a lead's type is changed to `self_gen`, the list still shows "Internet" because there's no condition for `self_gen`.

2. When an admin changes a lead's type via the dropdown in LeadDetail (e.g., from "internet" to "self_gen"), only the `lead_type` column is updated. The corresponding `user_metrics` counts are NOT adjusted -- meaning the rep's `internet_leads` stays at 1 when it should be 0, and `self_generated_leads` stays at 0 when it should be 1.

---

## Fix 1: Update Lead Type Badge in Leads List

**File:** `src/pages/admin/Leads.tsx` (lines 245-248)

Replace the two-state badge with a three-state badge:
- `canvasser` -> Purple badge, "Canvasser" label
- `self_gen` -> Green badge, "Self-Gen" label
- Default (internet) -> Blue badge, "Internet" label

---

## Fix 2: Adjust Metrics When Admin Changes Lead Type

**File:** `src/pages/admin/LeadDetail.tsx` (line 256)

When the lead type dropdown changes, instead of just doing `updateLead.mutate({ lead_type: v })`, call a new database function that atomically:

1. Updates the `lead_type` column on `quote_requests`
2. If the lead was already counted (`counted_as_lead = true`) and has an `assigned_to`, decrements the old type's metric and increments the new type's metric on `user_metrics`

**Database migration:** Create a new `SECURITY DEFINER` function `change_lead_type(p_lead_id uuid, p_new_type text)` that:
- Reads the current lead's `lead_type`, `assigned_to`, and `counted_as_lead`
- If counted and assigned, decrements the old metric column and increments the new one
- Updates the `lead_type` on the lead
- Logs the change in `lead_activity_log`

This ensures that when an admin switches a lead from "internet" to "self_gen", Adam Coury's `internet_leads` goes from 1 to 0 and `self_generated_leads` goes from 0 to 1.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/admin/Leads.tsx` | Add self_gen badge variant (green) |
| `src/pages/admin/LeadDetail.tsx` | Call `change_lead_type` RPC instead of raw update |
| Database migration | Create `change_lead_type` function that adjusts metrics atomically |

---

## One-Time Data Fix

After deploying the function, the Russ Pace lead (which was already changed to self_gen in the DB) needs its metrics corrected. A one-time migration will:
- Decrement Adam Coury's `internet_leads` by 1
- Increment Adam Coury's `self_generated_leads` by 1
