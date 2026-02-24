

# Enhanced Lead Notifications and Assignment Email

## Three Changes

### 1. Enhance `notify-new-lead` Email with More Details

The current notification email only shows basic contact info. Update it to also include details from the quote form (`form_data`), such as:
- Property type, roof type, number of stories, timeline, urgency
- Known issues, home age, square footage
- Referral source and best contact time
- Any additional notes/description

Also fix the email display so the client's actual email shows correctly (currently it showed "test@example.com" for the test -- this was test data, but we'll ensure the real email is properly passed through and displayed).

The `notify-new-lead` edge function will accept an additional `formData` field and render relevant details in the email body below the existing contact section.

**File:** `supabase/functions/notify-new-lead/index.ts`

### 2. Pass `formData` from GetQuote.tsx to `notify-new-lead`

Update the `notify-new-lead` invocation in `GetQuote.tsx` to also send the `formData` object and the `bestContactTime` / `referralSource` fields so the email includes all available details.

**File:** `src/pages/GetQuote.tsx`

### 3. New Edge Function: `notify-lead-assigned`

Create a new edge function that sends an email to the same 4 recipients when a lead is assigned to a sales rep. The email will include:
- Lead name, service type, phone, email, address, reference number
- The assigned rep's name
- Link to the admin lead detail page

Trigger this from `LeadDetail.tsx` when the assignment dropdown changes to a rep (not "unassigned"). Fire-and-forget so it doesn't block the UI.

**Files:**
- `supabase/functions/notify-lead-assigned/index.ts` (new)
- `supabase/config.toml` (add function config)
- `src/pages/admin/LeadDetail.tsx` (add invocation after assignment)

---

## Technical Details

### `notify-new-lead` Updates

Add a new section to the HTML email template after the contact info block that renders form details dynamically. Key fields to display:
- Timeline / Urgency
- Property Type
- Roof Type / Age
- Number of Stories
- Home Size
- Known Issues
- Additional Notes
- Referral Source
- Best Contact Time

Only non-empty fields will be rendered.

### `notify-lead-assigned` Edge Function

| Detail | Value |
|--------|-------|
| From | `Next Generation Roofing <notifications@oknextgen.com>` |
| To | Same 4 recipients |
| Subject | `Lead Assigned: [Client Name] -- [Rep Name]` |
| Content | Lead summary + assigned rep name + admin link |

### Frontend Assignment Hook

In `LeadDetail.tsx`, after `updateLead.mutate({ assigned_to: v, ... })` succeeds, fire `supabase.functions.invoke("notify-lead-assigned", ...)` with the lead details and the selected rep's display name. This will be done in the `onSuccess` callback or immediately after the mutate call using the available lead data.

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/notify-lead-assigned/index.ts` | Email notification on lead assignment |

### Files to Modify
| File | Changes |
|------|---------|
| `supabase/functions/notify-new-lead/index.ts` | Add form details section to email template |
| `src/pages/GetQuote.tsx` | Pass `formData`, `bestContactTime`, `referralSource` to notify-new-lead |
| `src/pages/admin/LeadDetail.tsx` | Fire notify-lead-assigned on assignment change |
| `supabase/config.toml` | Add notify-lead-assigned function config |

