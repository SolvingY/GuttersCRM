

## Phase 1: Client Quote Request System - Implementation Plan

This is a large implementation covering the public quote form, database setup, photo uploads, admin lead management, navigation updates, and bug fixes.

---

### 1. Database Migration

Create `quote_requests` table, reference number sequence, auto-priority trigger, and storage bucket.

**Table: `quote_requests`**
- id (UUID, PK), created_at, updated_at
- service_type (text: 'commercial', 'residential', 'gutters', 'repair')
- form_data (JSONB - stores all dynamic service-specific answers)
- Contact: full_name, email, phone, street_address, city, state (default 'Oklahoma'), zip_code
- best_contact_time (text[]), referral_source (text)
- Lead management: status (default 'new'), priority (default 'normal'), assigned_to (UUID), assigned_at, assigned_by (UUID)
- photo_urls (text[])
- reference_number (text, unique, auto-generated)
- Tracking timestamps: contacted_at, quoted_at, quote_amount, won_at, lost_at, lost_reason
- Follow-up: last_followup_at, next_followup_due, followup_count (default 0)
- admin_notes (text)

**RLS Policies:**
- Anyone can INSERT (public form submission)
- Admins can SELECT, UPDATE, DELETE
- Assigned users (sales reps) can SELECT their own assigned leads

**Reference number sequence:**
- PostgreSQL sequence `quote_request_sequence`
- Function `generate_reference_number()` returns format `NGR-YYYY-#####`
- Default on reference_number column

**Auto-priority trigger:**
- BEFORE INSERT trigger checks form_data for timeline/urgency values
- Sets priority to 'urgent', 'high', or 'normal' accordingly

**Storage bucket:**
- Create `quote-photos` bucket (public)
- RLS: anyone can upload to the bucket, admins can read all

---

### 2. New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/GetQuote.tsx` | Main page: multi-step wizard container with progress indicator |
| `src/components/quote/ServiceSelection.tsx` | Step 1: 4 service type cards with icons |
| `src/components/quote/CommercialQuestions.tsx` | Step 2 variant: building type, sq footage, roof type, needs, timeline |
| `src/components/quote/ResidentialQuestions.tsx` | Step 2 variant: property type, home age, roof type, stories, needs, issues, timeline |
| `src/components/quote/GutterQuestions.tsx` | Step 2 variant: property type, needs, linear footage, issues, timeline |
| `src/components/quote/RepairQuestions.tsx` | Step 2 variant: what needs repair, urgency, property type, description (min 20 words), when noticed, photo upload |
| `src/components/quote/ContactInfoStep.tsx` | Step 3: name, email, phone, address, best contact time, referral source |
| `src/components/quote/QuoteConfirmation.tsx` | Step 4: success page with reference number, next steps |
| `src/pages/admin/Leads.tsx` | Admin leads dashboard: stats bar, filters, lead card list |
| `src/pages/admin/LeadDetail.tsx` | Individual lead detail: full form data, status/priority management, assignment, notes, photos, timeline |
| `supabase/functions/send-quote-email/index.ts` | Edge function: sends branded confirmation email to client via Resend |

---

### 3. Modified Files

**`src/App.tsx`** (3 new routes)
- `/get-quote` -> `GetQuote` component
- `/admin/leads` -> `Leads` component (inside admin layout)
- `/admin/leads/:id` -> `LeadDetail` component (inside admin layout)

**`src/components/Header.tsx`**
- Add "Get an Estimate" CTA button in desktop nav (accent-styled Link to `/get-quote`)
- Add "Get an Estimate" link in mobile hamburger menu (before "Apply Now")
- Import `ClipboardList` icon from lucide-react

**`src/components/Hero.tsx`**
- Add third CTA button "Get a Free Estimate" (Link to `/get-quote`) alongside existing buttons
- Import `Link` from react-router-dom and `ClipboardList` from lucide-react

**`src/components/Footer.tsx`**
- Change "Free Estimate" quick link from `#contact` scroll to a Link to `/get-quote`
- Update social media links:
  - Instagram: `https://www.instagram.com/next_generation_roofing?igsh=eWF1eHZ5eXlpaDFv`
  - Add Facebook link (currently missing from footer social icons): `https://www.facebook.com/profile.php?id=100064277643225`
- Import `Link` from react-router-dom and `Facebook` icon

**`src/pages/admin/AdminLayout.tsx`**
- Add "Leads" nav item to `adminNavItems` array (ClipboardList icon, path `/admin/leads`)
- Add a second query to count new quote requests for notification badge on "Leads" nav item
- Fix bell dropdown score display: change `/20` to `/30` on line 147

**`src/pages/apply/ApplicationThankYou.tsx`**
- Update Facebook URL to `https://www.facebook.com/profile.php?id=100064277643225`
- Update Instagram URL to `https://www.instagram.com/next_generation_roofing?igsh=eWF1eHZ5eXlpaDFv`

**`src/components/admin/NewApplicantsModal.tsx`**
- Already displays `/30` (confirmed in code) -- no change needed

---

### 4. Quote Form Details

**Step 1 - Service Selection:** 4 large clickable cards with icons and descriptions. Single selection required before proceeding.

**Step 2 - Dynamic Questions:** Component renders based on selected service type. Each service has its own set of questions as specified (dropdowns, radio buttons, checkboxes, textareas). Repair type includes photo upload (up to 5 files, jpg/png/jpeg, max 10MB each) uploaded to `quote-photos` storage bucket.

**Step 3 - Contact Info:** Standard form fields. State defaults to Oklahoma. Phone input with formatting. Address fields required. Best contact time checkboxes. Referral source dropdown.

**Step 4 - Confirmation:** Shows reference number, service type summary, next steps, and "Return to Home" button. Triggers the `send-quote-email` edge function.

---

### 5. Admin Leads Dashboard

**Stats bar:** Shows count of leads by status (New, Contacted, Quoted, Scheduled, Won)

**Filters:** Status, service type, priority. Default sort by priority (urgent first), then date (newest).

**Lead cards:** Display service type icon, client name, address, priority badge (color-coded), status badge (color-coded), reference number, submission date, assigned rep dropdown.

**Lead detail view:**
- Full form data display (parsed from JSONB, rendered by service type)
- Status dropdown (new, contacted, quoted, scheduled, won, lost)
- Priority dropdown (urgent, high, normal, low)
- Assignment dropdown (lists users with 'user' or 'admin' role)
- Admin notes textarea (auto-saves)
- Photo gallery (if repair type with uploads)
- Timeline section (contacted_at, quoted_at timestamps)
- Win/Loss buttons with loss reason dropdown

---

### 6. Edge Function: `send-quote-email`

- No JWT verification required (public form submission)
- Accepts: client name, email, service type, reference number
- Sends branded HTML email via Resend from `invites@oknextgen.com` (same sender as invites)
- Email includes: reference number, service type, next steps, contact info, NGR branding

---

### 7. Bug Fix

**AdminLayout.tsx line 147:** Change `{a.dna_score}/20` to `{a.dna_score}/30` to match the updated 30-point weighted DNA scoring system.

