

# Move Schedule Appointment to Top, Add "Create Lead" for Reps, Add "Self-Gen" Lead Type with Full Metrics Tracking

---

## Change 1: Move "Schedule Appointment" Button to Top

**File:** `src/pages/dashboard/LeadDetailView.tsx` (lines 216-246)

Reorder the document action buttons so the Appointment button renders first, before the checklist, contract, flex schedule, and warranty buttons.

---

## Change 2: Add "Create Lead" Button to My Leads Page

**File:** `src/pages/dashboard/MyLeads.tsx`

- Import `CreateLeadDialog` and add a `+ Create Lead` button in the header area
- Also invalidate `my-leads` query after creation
- The dialog already handles all lead source options and assignment

---

## Change 3: Add "Self-Generated" Lead Source

**File:** `src/lib/leadSourceConfig.ts`

Add a `self_gen` entry with `Star` icon and `leadType: "self_gen"`.

**File:** `src/components/admin/CreateLeadDialog.tsx`

- Add `{ value: "self_gen", label: "Self-Generated" }` to `leadSourceOptions`
- After creation, if source is `self_gen`, update the lead's `lead_type` to `"self_gen"` (same pattern as canvasser post-creation update)

---

## Change 4: Self-Gen Badge Display

**File:** `src/pages/dashboard/MyLeads.tsx`

Update the lead type badge rendering to show a green "Self-Gen" badge when `lead_type === "self_gen"`.

**File:** `src/pages/admin/LeadDetail.tsx`

- Update the badge display to show three colors: blue (Internet), purple (Canvasser), green (Self-Gen)
- Add a "Lead Type" dropdown near the status/priority selects so admins can change any lead's type between `internet`, `canvasser`, and `self_gen`

---

## Change 5: Metrics Tracking for Self-Gen Leads (Database)

The existing database triggers `count_lead_on_assign`, `count_lead_on_insert_assign`, and `update_lead_close_stats` only handle `internet` and `canvasser` lead types. The `create_manual_lead` RPC also only maps to those two types. All need to be updated to support `self_gen`.

**Database migration** to update three functions and the RPC:

1. **`create_manual_lead`** -- Add mapping: when `p_lead_source = 'self_gen'`, set `v_lead_type := 'self_gen'`

2. **`count_lead_on_insert_assign`** -- Add `ELSIF NEW.lead_type = 'self_gen'` block that increments `self_generated_leads` on `user_metrics`

3. **`count_lead_on_assign`** -- Add the same `self_gen` branch to increment `self_generated_leads`

4. **`update_lead_close_stats`** -- Add `self_gen` branch that increments `self_generated_deals` and `closed_deals` + `approved_revenue` on won, and decrements on reversal

5. **`archive_lead`** -- Add `self_gen` branch to decrement `self_generated_leads` (and close stats if won) on archive

This ensures that when a rep or admin creates a self-gen lead, the assignment and close triggers correctly update the `user_metrics` table columns (`self_generated_leads`, `self_generated_deals`) that already exist.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/dashboard/LeadDetailView.tsx` | Move appointment button to first position |
| `src/pages/dashboard/MyLeads.tsx` | Add Create Lead button + dialog; Self-Gen badge |
| `src/lib/leadSourceConfig.ts` | Add `self_gen` entry |
| `src/components/admin/CreateLeadDialog.tsx` | Add Self-Generated option; post-create update for self_gen |
| `src/pages/admin/LeadDetail.tsx` | Self-Gen badge color; Lead Type admin dropdown |
| Database migration | Update `create_manual_lead`, `count_lead_on_insert_assign`, `count_lead_on_assign`, `update_lead_close_stats`, `archive_lead` to handle `self_gen` lead type |

