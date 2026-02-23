

# Fix: "Signature required" error when updating recalled contract

## Problem
After recalling a contract back to `draft` status, clicking "Update Contract" triggers the `handleSave` function which always requires a customer signature before saving. This makes it impossible to update the contract form data (e.g., add payment terms, install date) without first signing it again -- defeating the purpose of the recall feature.

## Solution
Modify the `handleSave` function in `GutterContract.tsx` to only require the customer signature when the contract is being saved as "signed". When the form is in `draft` status (e.g., after a recall), allow saving the form data without a signature so the rep can update fields and then resend for customer signing.

## Changes

**File: `src/pages/dashboard/forms/GutterContract.tsx`**

In `handleSave` (~line 180):
- Check if the existing form status is `draft` -- if so, save form data without requiring signature and keep status as `draft`
- Only require signature and set status to `signed` when no existing form exists or the form is not in draft state
- When saving a draft, update only `form_data` and `updated_at` (skip signature fields and status change)
- Skip the status transition to "scheduled" when just updating a draft

This way:
1. After recall, the rep can edit contract fields freely and click "Update Contract" to save changes
2. The rep then uses "Send to Customer for Signature" to send the corrected contract
3. Customer signature is only required for the final sign action, not for draft saves

