

# Demo Contract Email, Signed Contract Filing, Lead Card Layout Fix, and Collapsible Sections

## 1. Send Demo Contract Email (Russ Pace Job)

I will invoke the `send-contract-signing-email` edge function directly to send a demo contract signing email to `adamundergroundcoury@gmail.com` for the Russ Pace job. This will use the existing contract-signing email template so you can see exactly what a customer would receive. Since no contract form exists yet for this lead, I will first create a contract form record with a signing token, then trigger the email.

**Steps:**
- Create a `lead_forms` record of type "contract" for the Russ Pace lead with pre-filled form data from the lead record (name, address, quote amount of $4,345)
- Call `send-contract-signing-email` with `clientEmail: adamundergroundcoury@gmail.com` to send the demo

## 2. Auto-File Signed Contracts on the Lead Card

Currently, when a customer signs a contract remotely via the `/sign/:token` route, the `lead_forms` record is updated with the signature data but the signed contract PDF is not automatically saved as a file on the lead card's Files section.

**Changes:**
- Update `SignContract.tsx` (the public signing page): After a successful customer signature, automatically create a record in the `lead_files` table categorizing it as a "Contract" document, referencing the signed form
- Update `notify-contract-signed` edge function: After processing the signature, generate a reference entry in `lead_files` so the signed contract appears in the "Lead Files" section on both admin and rep lead detail views
- The contract can be viewed via the existing "View Contract" button which already loads the `lead_forms` record with all signature data

## 3. Fix Lead Card Layout (Desktop/Tablet)

The current layout uses a `grid-cols-1 lg:grid-cols-3` grid with the left column (`col-span-2`) containing only Service Details, Contact Info, Photos, and Saved Estimates -- which can be very sparse. The right column has 8+ sections (Assignment, Follow-up, Quote, Outcome, Scheduling, Timeline, Archive, Files, Activity Log, Notes) making it feel like everything is shoved to the right.

**Fix (both `LeadDetail.tsx` and `LeadDetailView.tsx`):**
- Change the grid from `lg:grid-cols-3` (2:1 split) to `lg:grid-cols-5` with left as `lg:col-span-3` and right as `lg:col-span-2`
- This gives a more balanced 60/40 split instead of 67/33
- Move the **Scheduling/Payments** and **Files** sections to the left column since they contain substantial content
- This redistributes content more evenly between both columns

## 4. Collapsible Categories on Lead Cards

Wrap the major sections on both the admin and rep lead detail views in collapsible containers so users can expand/collapse them.

**Sections to make collapsible (both views):**
- Service Details (default: open)
- Contact Information (default: open)
- Photos (default: open)
- Saved Estimates (default: open)
- Follow-up (default: open)
- Quote Approval (default: collapsed)
- Outcome (default: open)
- Scheduling/Payments (default: open)
- Timeline (default: collapsed)
- Files (default: collapsed)
- Activity Log (default: collapsed)
- Admin Notes (default: collapsed) -- admin only
- Archive (default: collapsed) -- admin only
- Assignment (default: open) -- admin only

**Implementation:**
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Add `ChevronDown`/`ChevronRight` icons for toggle indicators
- Add state variables for each collapsible section
- Wrap each card section with the collapsible pattern already used in `AdminOverview.tsx` and `CompanyGoals.tsx`

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/LeadDetail.tsx` | Fix layout grid, add collapsible sections, move sections to left column |
| `src/pages/dashboard/LeadDetailView.tsx` | Fix layout grid, add collapsible sections, move sections to left column |
| `src/pages/public/SignContract.tsx` | Auto-file signed contract to lead_files after signing |
| `supabase/functions/notify-contract-signed/index.ts` | Add lead_files record for signed contract |

## Demo Email

After implementing, I will call the edge function to send the demo contract email to `adamundergroundcoury@gmail.com` so you can verify the email template in your inbox.
