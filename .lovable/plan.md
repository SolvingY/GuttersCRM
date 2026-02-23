

# Demo Contract Email, Auto-File Signed Contracts, Lead Card Layout Fix, and Collapsible Sections

## 1. Send Demo Contract Email (Russ Pace Job)

Found the Russ Pace lead (ID: `dc45005b-867d-450a-bfe5-c5c030fa7f5e`, quote: $4,345, status: scheduled).

**Steps:**
- Create a `lead_forms` record of type "contract" for the Russ Pace lead with a signing token and 7-day expiry
- Call the `send-contract-signing-email` edge function with `clientEmail: adamundergroundcoury@gmail.com` to send the demo email
- You'll receive the email with a "REVIEW & SIGN CONTRACT" button linking to the signing page

## 2. Auto-File Signed Contracts on Lead Card

When a customer signs a contract via the `/sign/:token` route, the signed contract should automatically appear in the lead's Files section.

**Changes:**
- **`notify-contract-signed` edge function**: After logging the activity, insert a record into `lead_files` with `file_type: 'Contract'`, `file_name: 'Signed Contract - [customerName]'`, and `file_url` pointing to a reference path (e.g., `form://contract/[formId]`). Use the lead's `assigned_to` as `uploaded_by`.
- This ensures the signed contract shows up in the Files section on both admin and rep lead detail views without any additional manual steps.

## 3. Fix Lead Card Layout (Desktop/Tablet)

The current grid is `lg:grid-cols-3` with the left column at `col-span-2` (67%) and right at 1 column (33%). This crams too much into the narrow right column.

**Fix (both `LeadDetail.tsx` and `LeadDetailView.tsx`):**
- Change grid from `lg:grid-cols-3` to `lg:grid-cols-5`
- Left column: `lg:col-span-3` (60%)
- Right column: `lg:col-span-2` (40%)
- Move **Scheduling/Payments** and **Files** sections from right to left column to balance content

## 4. Collapsible Categories on Lead Cards

Wrap each section in a `Collapsible` component with a toggle trigger showing a chevron icon.

**Sections and defaults:**

| Section | Default State | Notes |
|---------|--------------|-------|
| Service Details | Open | |
| Contact Information | Open | |
| Photos | Open | |
| Saved Estimates | Open | |
| Scheduling/Payments | Open | Moved to left column |
| Files | Open | Moved to left column |
| Assignment | Open | Admin only |
| Follow-up | Open | |
| Quote Approval | Collapsed | |
| Outcome | Open | |
| Timeline | Collapsed | |
| Activity Log | Collapsed | |
| Admin Notes | Collapsed | Admin only |
| Archive | Collapsed | Admin only |

**Implementation:**
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Import `ChevronDown`, `ChevronRight` icons
- Add boolean state variables for each section (e.g., `serviceOpen`, `contactOpen`, etc.)
- Wrap each card with the collapsible pattern: clickable header toggles content visibility

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/LeadDetail.tsx` | Fix grid layout (5-col), move sections, add collapsibles |
| `src/pages/dashboard/LeadDetailView.tsx` | Fix grid layout (5-col), move sections, add collapsibles |
| `supabase/functions/notify-contract-signed/index.ts` | Insert `lead_files` record for signed contract |

## Demo Email

After implementing, I will create the contract form record for Russ Pace and invoke the edge function to send the demo contract email to `adamundergroundcoury@gmail.com`.

