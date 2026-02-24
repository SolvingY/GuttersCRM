

# Auto-Update Approved Revenue on Contract Signing and Collections on Job Close

## Overview
Currently, "Approved Revenue" only updates when a lead status changes to "won" (via the `update_lead_close_stats` database trigger). The user wants two changes:
1. When a contract is **signed** (gutters or roofing), the assigned rep's Approved Revenue increases by the quote amount
2. When a job is **closed** (status becomes "completed"), the rep's Collections increases by the total collected amount

## Current Behavior
- `update_lead_close_stats` trigger fires on status change to "won" and increments `approved_revenue`
- Collections are aggregated client-side from `lead_payments` joined through `weekly_user_metrics` -- there is no automatic increment on job close

## Changes

### 1. Database Trigger: Update Approved Revenue on Contract Signing
Modify the `update_lead_close_stats` trigger to also fire when status changes to "scheduled" (which happens automatically on contract signing). Since contract signing transitions the lead from "won" or "approved" to "scheduled", we need to ensure the approved_revenue is credited at the right moment.

**Approach**: Rather than changing the trigger (which could double-count if "won" already credited), we will:
- Keep "won" status incrementing `approved_revenue` and `closed_deals` as-is (since that is when a deal is considered closed)
- Add a new check: if status changes to "scheduled" and the previous status was NOT "won" (i.e., it went directly from "approved" to "scheduled" via contract signing), also increment `approved_revenue` and `closed_deals`

Actually, looking at the flow more carefully:
- Quote approved -> status stays at current status, `quote_status` changes to "approved"
- Rep marks as "won" -> status = "won", trigger fires, approved_revenue incremented
- Contract signed -> status = "scheduled"

So currently, approved_revenue already updates on "won". The user wants it to update on contract signing instead. This means we should:
- **Remove** the approved_revenue increment from the "won" status change
- **Add** it to the "scheduled" status change (contract signed)

### 2. Database Trigger: Update Collections on Job Close
Add logic to the trigger so that when status changes to "completed", the system sums all `lead_payments` for that lead and adds the total to the rep's `collections` in `user_metrics`.

### 3. Migration SQL
A single migration that replaces the `update_lead_close_stats` function with the updated logic:

**On status change to "won"**: Only increment `closed_deals` and type-specific close counts (internet_leads_closed, canvass_deals_closed, self_generated_deals). No longer increment `approved_revenue`.

**On status change to "scheduled"**: Increment `approved_revenue` by `quote_amount` for the assigned rep. This is when the contract is actually signed.

**On status change to "completed"**: Sum all `lead_payments.amount` for the lead and add to `collections` in `user_metrics` for the assigned rep.

**Reversal logic**: Update the reversal logic to match -- if status changes FROM "scheduled", reverse the approved_revenue. If status changes FROM "completed", reverse collections.

### 4. Frontend: handleCloseJob Enhancement
No frontend changes needed -- the trigger handles everything automatically when the status changes to "completed" via the existing `handleCloseJob` function.

## Technical Details

### Migration: Updated `update_lead_close_stats` function

| Status Change | Action |
|---------------|--------|
| To "won" | Increment `closed_deals`, type-specific close counts (no approved_revenue change) |
| From "won" | Reverse `closed_deals`, type-specific close counts |
| To "scheduled" | Increment `approved_revenue` by `quote_amount` |
| From "scheduled" | Reverse `approved_revenue` by `quote_amount` |
| To "completed" | Sum `lead_payments` for lead, add to `collections` |
| From "completed" | Reverse `collections` by the same sum |

### Files Changed

| File | Change |
|------|--------|
| Database migration (SQL) | Update `update_lead_close_stats` trigger function to move approved_revenue to "scheduled" and add collections on "completed" |

No frontend code changes are needed since the database trigger handles the metric updates automatically.

