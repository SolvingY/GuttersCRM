

# Lead Card Enhancements: Quote Email Fix, Preview, and File Uploads

## Problems Identified

1. **Quote email doesn't show the price** -- The `send-quote-email` edge function sends a generic "Quote Request Confirmation" that says "We've received your request" but never mentions the actual dollar amount ($4,345). It's essentially resending the initial confirmation, not a real quote.
2. **No way to see what was sent** -- After clicking "Send Quote to Client," you just see "Quote sent on 2/21/2026" with no way to preview the email content.
3. **No file upload section** -- Sales reps have no way to attach contracts, drawings, or warranty paperwork to a lead.

---

## Fix 1: Update the Quote Email to Actually Show the Quote

Update the `send-quote-email` edge function to:
- Accept the `quoteAmount` parameter (already passed from the UI but ignored)
- Change the email subject to "Your Quote from Next Generation Roofing"
- Include the dollar amount prominently in the email body
- Include service type, reference number, and a professional layout
- Store a snapshot of what was sent (amount, date, service) in a new `quote_email_html` column on `quote_requests` so the email can be previewed later

### Database Change
Add a column to `quote_requests`:
```
ALTER TABLE quote_requests ADD COLUMN quote_email_snapshot TEXT;
```
This stores the HTML that was sent so it can be previewed on the card.

### Edge Function Changes (`send-quote-email`)
- Use `quoteAmount` in the email template
- Return the generated HTML in the response so the UI can save it as the snapshot
- New subject: "Your Quote - $X,XXX.XX | Next Generation Roofing"
- Email body shows: service type, quote amount (large/bold), reference number, next steps, contact info

---

## Fix 2: Add "View Sent Quote" Button

Update `QuoteApprovalSection.tsx`:
- After a quote is sent (when `quote_sent_at` exists), show a "View Sent Quote" button
- Clicking it opens a dialog/modal that renders the stored `quote_email_snapshot` HTML in an iframe or sanitized container
- If no snapshot exists (for quotes sent before this update), show a message: "Preview not available for quotes sent before this update"

---

## Fix 3: Lead File Uploads Section

### Database Changes
Create a new `lead_files` table:
```
- id (UUID, PK)
- lead_id (UUID, FK to quote_requests)
- uploaded_by (UUID)
- file_name (TEXT)
- file_url (TEXT)
- file_type (TEXT) -- 'contract', 'drawing', 'warranty', 'other'
- file_size (INTEGER)
- created_at (TIMESTAMPTZ)
```

RLS: Admins can manage all; assigned reps can manage files on their assigned leads.

### Storage Bucket
Create a `lead-files` storage bucket (private) with RLS policies allowing authenticated users to upload/read.

### New UI Component: `LeadFilesSection.tsx`
- Placed on the lead detail page (left column, after Photos section)
- Shows uploaded files grouped by type (Contracts, Drawings, Warranty, Other)
- Upload button with file type dropdown
- Each file shows: name, type badge, upload date, uploaded by, download link, delete button (admin only)
- Drag-and-drop or click-to-upload interface

---

## Files Changed

| File | Action |
|---|---|
| Database migration | New -- add `quote_email_snapshot` to `quote_requests`, create `lead_files` table, create `lead-files` storage bucket with policies |
| `supabase/functions/send-quote-email/index.ts` | Edit -- include quote amount in email, return HTML for snapshot |
| `src/components/admin/QuoteApprovalSection.tsx` | Edit -- save snapshot after sending, add "View Sent Quote" button with preview dialog |
| `src/components/admin/LeadFilesSection.tsx` | New -- file upload/management component for lead cards |
| `src/pages/admin/LeadDetail.tsx` | Edit -- add LeadFilesSection to the page layout |

---

## Technical Notes

- The `quote_email_snapshot` column stores raw HTML (the exact email body sent). It's rendered in a sandboxed iframe for preview.
- The `lead-files` storage bucket is private; files are accessed via signed URLs.
- File type categories: Contract, Drawing, Warranty, Other -- shown as filter tabs or badges.
- Max file size handled by storage defaults (50MB).
- The edge function now returns `{ success: true, result, html }` so the client can save the HTML snapshot before updating `quote_sent_at`.

