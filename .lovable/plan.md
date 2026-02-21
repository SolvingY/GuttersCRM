

# Quote Validity, Approval Email with PDF, and PDF Layout Improvements

## What We're Building

Five connected changes that add quote expiration tracking, automatically email a professional PDF to the customer when a manager approves a quote, and improve the PDF layout with per-item warranties and discount display.

---

## Part 1: Database Migration

Add a `validity_days` column to the `quote_requests` table:

```sql
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS validity_days integer DEFAULT 7;
```

This runs first so the frontend can save validity days on approval.

---

## Part 2: Shared PDF Builder — New File `src/lib/generateEstimatePDF.ts`

Extract the PDF generation logic from `NGRGutterCalculator.tsx` into a standalone, React-free utility function.

**Interface:**

```text
EstimatePDFData {
  jobInfo: { customer, city, state, jobNumber }
  protProduct, protFootage, gutterSize, gutterColor, gutterFootage
  dsTotalFootage
  addons: { name, qty, unit }[]
  clampedQuoted, totalRetail
  validityDays?, approvedAt?, logoBase64?
}

buildEstimatePDF(data) -> Promise<jsPDF>
```

**PDF Layout Changes (vs current):**

- **Per-item warranties**: Warranties now appear indented directly below each relevant scope line item instead of grouped at the bottom
  - Gutter line -> 3 warranty items indented below (Leak-Free, Rebate, Paint)
  - Protection line -> product-specific warranty indented below
  - Cheap Mesh -> "no warranty" note
- **Discount display**: When `clampedQuoted < totalRetail`, the total box shows:
  - Original Value (9pt, gray)
  - YOUR PRICE (14pt, bold)
  - You Save (10pt, green)
- **Validity warning**: Below the grand total: "This quote is valid for X days from [date]."
- **Footer validity**: Additional expiry note in the footer section

**Logo loading helper** is also exported from this file for reuse.

---

## Part 3: Update `NGRGutterCalculator.tsx`

- Remove the inline `handleGeneratePDF` function's PDF-building logic
- Import and call `buildEstimatePDF()` from the shared utility instead
- Keep the validation check (no items = toast warning + abort)
- Keep the download + storage upload logic
- Remove `loadLogoBase64` (now in shared utility)
- Pass `lead?.validity_days` through to the PDF builder

---

## Part 4: Update `QuoteApprovalSection.tsx`

**New state:**
- `validityDays` (string, default "7")
- `approving` (boolean, for loading state during the full approval flow)

**New UI** (inside the `pending_approval` admin block):
- "Quote Valid For (days)" number input with placeholder "7"
- Live expiry date preview below: "Quote expires: March 7, 2026"

**Updated `handleApprove` flow** (exact sequence):
1. Save approval + `validity_days` to DB
2. Query `gutter_estimates` for this lead
3. If estimate found:
   a. Load logo as base64
   b. Call `buildEstimatePDF()` with estimate data
   c. Convert to base64 string (strip data URI prefix)
   d. Call `send-quote-approval-email` edge function with PDF + lead details
   e. Upload PDF blob to `lead-files` storage
   f. Insert record into `lead_files` table
4. If no estimate found:
   a. Call `send-quote-approval-email` with no PDF (plain text amount only)
5. Show success toast

---

## Part 5: New Edge Function `send-quote-approval-email`

**File:** `supabase/functions/send-quote-approval-email/index.ts`

**Config:** Add `verify_jwt = false` to `supabase/config.toml`

**Accepts:** `clientName`, `clientEmail`, `quoteAmount`, `validityDays`, `approvedAt`, `referenceNumber`, `pdfBase64?`, `pdfFileName?`

**Email:**
- From: `notifications@oknextgen.com`
- Subject: "Your Next Generation Guttering Estimate -- [Name]"
- Body: Professional HTML email with quoted amount, validity warning, and contact info
- Attachment: PDF via Resend's `attachments` field (base64, no data URI prefix) -- only if `pdfBase64` is provided

---

## Files Changed

| File | Action |
|---|---|
| Database migration | Add `validity_days integer DEFAULT 7` to `quote_requests` |
| `src/lib/generateEstimatePDF.ts` | New -- shared PDF builder with per-item warranties, discount display, validity |
| `src/components/NGRGutterCalculator.tsx` | Refactor to use shared PDF builder |
| `src/components/admin/QuoteApprovalSection.tsx` | Add validity field, approval-triggered PDF generation + email |
| `supabase/functions/send-quote-approval-email/index.ts` | New edge function for approval email with PDF attachment |
| `supabase/config.toml` | Add `[functions.send-quote-approval-email]` entry (auto-managed) |

## What Does NOT Change

- Pricing constants or calculation logic
- On-screen calculator UI
- Save/upsert functionality
- Existing `send-quote-email` edge function
- `LeadFilesSection.tsx` (already has "estimate" file type from previous update)

