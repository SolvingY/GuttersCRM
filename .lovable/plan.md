

# Onboarding System Overhaul — Implementation Plan

This is a large, multi-part change touching database schema, seed data, and significant frontend rewrites across 3+ files. Here's the breakdown.

---

## Part 1: Database Changes

### Migration: Replace onboarding steps
- DELETE all existing rows from `onboarding_steps`
- DELETE all existing `user_onboarding_progress` records (they reference old steps)
- INSERT 14 new steps with exact keys, names, types, and sort_order as specified
- Re-mark all existing users with `onboarding_complete = true` so they aren't forced through the new flow

### Migration: Create offer letter tables
- `offer_letter_templates` — stores reusable letter templates with `{{variable}}` placeholders
- `contractor_offer_letters` — stores sent letters per contractor, tracks status (pending_review / signed / declined)
- RLS policies: admins get full access; users can SELECT/UPDATE their own rows
- Seed one default "Sales Representative" template

### Migration: Add `metadata` column to `user_onboarding_progress`
- The existing table may or may not have a `metadata` jsonb column. The code references it but the migration that created the table needs to be checked. If missing, add `metadata jsonb default '{}'::jsonb`.

---

## Part 2: Frontend — OnboardingFlow.tsx (Full Rewrite)

Replace the entire `StepContent` switch and all sub-components. New step type handlers:

### `document_sign` (step_key: `contract_sign`)
- Query `contractor_offer_letters` for current user
- **No letter**: Show waiting state with clock icon, no complete button
- **Pending**: Show letter content (or PDF link), signature area with typed name in `font-serif italic text-2xl`, checkbox, "Sign & Accept" button, plus "Decline Offer" link with confirmation dialog
- **Signed**: Green completed state

### `inline_form` (NEW — 3 components)
- **W9Form**: Full IRS-style form with tax classification radios, TIN toggle (SSN/EIN), certification text, typed signature, submit saves to `user_onboarding_progress.metadata`
- **ModelReleaseForm**: Legal name, DOB, address, phone, email, agreement text, minor checkbox with guardian fields, typed signature
- **DirectDepositForm**: Account holder, bank, routing (9-digit validation), account number with confirmation match, account type radio, authorization text, typed signature

All three share a typed-signature pattern: `<input>` + live preview in `font-serif italic text-2xl` with bottom border + auto-date.

### `confirmation` (NEW)
- Per-step content based on `step_key`:
  - `google_email`: Description text + "I Have My Google Email" button
  - `group_chat`: Description text + "I'm in the Group Chat" button
  - `uniform`: Description text + "I Have My Uniform" button
  - `sales_materials`: Checklist with 5 checkboxes, all must be checked → "I Have All My Materials" button

### `tool_setup` (Extended)
- Add step_key mappings for `setup_lead_scout`, `setup_discord`, `setup_hail_trace` with appropriate descriptions

### `policy_ack` (Updated for `tools_insurance`)
- Show the tools & insurance policy text in a scrollable box
- Checkbox + "I Understand and Accept" button

### Remove
- `AssessmentStep` component (DNA assessment)
- `TrainingStep` component
- `InfoReviewStep` component
- `DocumentUploadStep` component
- Old `STEP_ICONS` mappings

### Update `STEP_ICONS`
- Map all 14 new step_keys to appropriate Lucide icons

---

## Part 3: Admin OnboardingManagement.tsx — Add Offer Letters Tab

Add a tabbed interface to the existing page with two tabs: "Team Progress" (existing content) and "Offer Letters" (new).

### Offer Letters tab contains three sections:

**Section A — Templates**
- List templates, edit/delete inline
- "New Template" form: position title, pay structure, letter body (with `{{variable}}` placeholders)

**Section B — Send Offer Letter**
- Dialog with contractor selector, method toggle (Template vs PDF Upload)
- Template mode: select template, fill start date / position / pay structure / additional terms, live preview with replaced variables
- PDF mode: file upload to `contractor-files` bucket, position/name inputs
- On send: insert `contractor_offer_letters` row, upsert `user_onboarding_progress` for `contract_sign` step to `in_progress`

**Section C — Sent Letters Tracker**
- Table: Contractor | Position | Sent Date | Status badge | Signed Date
- Expandable rows showing letter content or PDF link

---

## Part 4: File Structure

New/modified files:
- `supabase/migrations/...` — 1 migration for steps + offer letter tables
- `src/pages/onboarding/OnboardingFlow.tsx` — full rewrite (~900 lines)
- `src/pages/admin/OnboardingManagement.tsx` — add tabs + offer letters (~800 lines)
- `src/components/onboarding/W9Form.tsx` — new (~250 lines)
- `src/components/onboarding/ModelReleaseForm.tsx` — new (~200 lines)
- `src/components/onboarding/DirectDepositForm.tsx` — new (~200 lines)
- `src/components/onboarding/ConfirmationStep.tsx` — new (~120 lines)
- `src/components/onboarding/ContractSignStep.tsx` — new (~250 lines)
- `src/components/onboarding/ToolSetupStep.tsx` — new (~80 lines)
- `src/components/onboarding/PolicyAckStep.tsx` — new (~100 lines)

---

## Execution Order

1. Database migration (steps replacement + offer letter tables)
2. Create onboarding step components (inline forms, confirmation, contract sign, etc.)
3. Rewrite OnboardingFlow.tsx to use new components
4. Add Offer Letters tab to OnboardingManagement.tsx
5. Remove DNA assessment references from onboarding

