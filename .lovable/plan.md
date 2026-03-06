

# Add Offer Letter Access from Contractor Profile

## Problem
The "Send Offer Letter" functionality is only accessible from Admin → Onboarding Management → Offer Letters tab. When viewing a contractor profile in Contractor MGMT, there's no way to send or view offer letters — forcing admins to navigate away.

## Plan

### Add an "Offer Letter" section to ContractorProfileSheet.tsx

Inside the existing contractor profile sheet, add a new collapsible section (like the existing Documents, Performance Reviews sections) called **"Offer Letter"** that:

1. **Queries `contractor_offer_letters`** for the selected contractor
2. **If no letter exists**: Shows a "Send Offer Letter" button that opens the existing `SendOfferLetterDialog` (extracted as a shared component or duplicated inline)
3. **If letter exists**: Shows status badge (Pending / Signed / Declined), position title, sent date, signed date, and a preview/expand of the letter content or PDF link
4. **Quick send option**: A simplified inline form — select template or upload PDF, fill position/start date, send — without needing to navigate to OnboardingManagement

### File Changes

- **`src/components/admin/ContractorProfileSheet.tsx`**: Add a new "Offer Letter" collapsible section after the onboarding checklist section. Query `contractor_offer_letters` for the contractor. Show status or send button. Include a mini send dialog inline.

- **No database changes needed** — the `contractor_offer_letters` table and RLS policies already exist.

### Section Layout
- Collapsible header: "Offer Letter" with FileText icon + status badge
- If no letter: "No offer letter sent" message + "Send Offer Letter" button
- If letter exists: Card showing position, status, dates, with expandable content preview
- Send dialog reuses the same pattern from OnboardingManagement (template select or PDF upload, start date, position title)

