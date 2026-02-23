

# Fix Client Signing Error + Add In-Person Signing Flow

## Problem 1: Client Signing Error (Red Error Message)
When a customer tries to sign a contract that was recalled and resent, they may encounter an RLS (row-level security) error. The pre-validation check we just added should now show a friendly message instead of a raw error. However, there may also be a token mismatch issue: when a contract is recalled and resent, the `handleResend` function pulls the old `signing_token` from the stale component state rather than refetching from the database. We need to ensure `handleSendForSignature` (which is used after recall, not `handleResend`) properly generates a fresh token.

**Fix**: After the recall + resend flow, the `handleSendForSignature` function already upserts with the existing form ID, which preserves the `signing_token` (since it's not in the upsert payload). We need to verify the token used in the email matches what's in the DB by reading it back from the upsert response -- which it already does via `.select().single()`. This part should already work correctly. The client error was likely the RLS violation that our pre-validation now catches gracefully.

No additional code changes needed for this -- the fix from the last edit (pre-checking status before attempting the update) should resolve it.

## Problem 2: In-Person Signing with Email Confirmation

Currently, the rep can have the customer sign in person using the signature pad, then click "Sign & Save Contract." But there's no way to send the customer a confirmation email afterward.

### Changes

**File: `src/pages/dashboard/forms/GutterContract.tsx`**

- After saving an in-person signed contract, add a "Send Signed Copy to Customer" button that appears when a contract has `status: 'signed'` and was signed in person (has `signature_data` but no `customer_signed_at` -- meaning it wasn't done via the remote signing flow)
- Also add the option inline: after clicking "Sign & Save Contract", automatically trigger a confirmation email to the customer
- Add a new button in the signed status bar: "Email Copy to Customer" that invokes a new edge function

**File: `supabase/functions/send-signed-contract-confirmation/index.ts`** (new)

Create a new edge function that sends a confirmation email to the customer after an in-person signing. The email will:
- Confirm their contract has been signed
- Include contract details (amount, rep name, address)
- Include company contact info
- NOT include a signing link (since it's already signed)

**File: `src/pages/dashboard/forms/GutterContract.tsx`** (additional changes)

- In `handleSave` (for non-draft saves), after successfully saving the contract, invoke the `send-signed-contract-confirmation` edge function to email the customer automatically
- Also update the lead status to "scheduled" (which already happens)
- Log activity: "Contract signed in person by [name], confirmation sent to [email]"

### Detailed Changes

#### 1. New Edge Function: `send-signed-contract-confirmation`

Accepts: `clientName`, `clientEmail`, `contractAmount`, `repName`, `signedDate`

Sends a confirmation email:
- Subject: "Your Contract with Next Generation Guttering is Confirmed"
- Body: Confirmation that the contract was signed, contract amount, rep name, and company contact info
- Professional template matching existing email styles

#### 2. GutterContract.tsx Updates

In `handleSave` (non-draft path):
- After saving the contract and updating lead status, call `send-signed-contract-confirmation` with the customer's email
- This sends the confirmation automatically when a rep saves an in-person signed contract

In the signed status bar (where it shows "Signed by [name]"):
- Add an "Email Copy" button so the rep can resend the confirmation email anytime after the contract is signed

#### 3. Flow Summary

**In-Person Signing:**
1. Rep fills out contract with customer present
2. Customer signs on rep's device using the signature pad
3. Rep clicks "Sign & Save Contract"
4. Contract saves as "signed", lead moves to "scheduled"
5. Confirmation email automatically sent to customer
6. Rep can resend the confirmation email later from the signed status bar

## Technical Details

| File | Change |
|------|--------|
| `supabase/functions/send-signed-contract-confirmation/index.ts` | New edge function for confirmation email |
| `src/pages/dashboard/forms/GutterContract.tsx` | Auto-send confirmation on in-person save; add "Email Copy" button to signed status bar |

