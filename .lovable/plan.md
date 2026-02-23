
# Recall Sent Quotes and Contracts + Required Contract Fields

## Overview
Three changes:
1. Add a "Recall Quote" button to reset sent quotes back to pending approval
2. Add a "Recall Contract" button to void sent contracts so they can be corrected and resent
3. Make key contract fields (Payment Terms and Install Date) required before sending

---

## 1. Recall Quote (QuoteApprovalSection.tsx)

After a quote has been sent (`quote_sent_at` is set), add a "Recall Quote" button (admin only) that:
- Resets `quote_status` to `pending_approval`
- Clears `quote_sent_at`, `quote_email_snapshot`, `quote_approved`, `quote_approved_by`, `quote_approved_at`
- Keeps the `quote_amount` intact
- Logs a `quote_recalled` activity in `lead_activity_log`
- Shows an AlertDialog confirmation before executing

The button appears next to "View Sent Quote" with a destructive outline style and an Undo icon.

---

## 2. Recall Contract (GutterContract.tsx)

When a contract has been sent (`status: 'sent'`) but not yet signed, add a "Recall Contract" button in the awaiting-signature status bar that:
- Updates the `lead_forms` record: sets `status` to `'draft'`, clears `sent_for_signing_at`, and sets `token_expires_at` to a past date (invalidating the signing link)
- Logs a `contract_recalled` activity in `lead_activity_log`
- Shows an AlertDialog confirmation
- After recall, the rep can edit the contract and resend

This button sits alongside the existing "Resend" button in the amber "Awaiting customer signature" banner.

---

## 3. Required Fields Before Sending Contract

In `handleSendForSignature`, add validation that blocks sending if these fields are empty:
- `contractPrice` (Contract Price)
- `downPayment` (Down Payment -- can be 0 but must be explicitly set)
- `startDate` (Approx Start Date)
- `signatureDate` (Agreement Date)

If any are missing, show a toast error listing which fields need to be filled in. The "Send to Customer for Signature" button remains enabled but validation fires on click.

Also add visual required indicators (red asterisk) to these field labels.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/QuoteApprovalSection.tsx` | Add recall quote handler, AlertDialog, and Recall button after "sent" state |
| `src/pages/dashboard/forms/GutterContract.tsx` | Add recall contract handler, AlertDialog in awaiting-signature banner, and required field validation before send |

## Technical Details

- Import `AlertDialog` components and `Undo2` icon from lucide-react
- Quote recall updates 6 fields on `quote_requests` in a single mutation
- Contract recall updates 3 fields on `lead_forms` in a single update
- Both recall actions insert an activity log entry for audit trail
- Required field validation uses simple string checks before the existing `handleSendForSignature` logic
- No database schema changes needed -- all fields already exist
