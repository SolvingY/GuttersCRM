
## Contractor Management — Full Profile, DNA Assessment & File Upload Upgrade

This plan covers four interconnected features:
1. Expanded contractor profile cards with a slide-out detail panel
2. Revised tab structure (Active / Onboarding / Archived — no "All Team")
3. File uploads per contractor profile (stored in a new storage bucket)
4. DNA Assessment prompt for users who haven't taken it — pre-filled from their profile data

---

### Scope Summary

| Feature | Work Required |
|---|---|
| Contractor profile detail drawer/sheet | New component |
| DNA Assessment view inside the profile | Reuse `dnaCategories` / `dnaQuestions` logic already in `dnaAssessment.ts` |
| File upload to contractor profile | New `contractor-files` storage bucket + DB table |
| Re-define tab logic | Active = not archived; Onboarding = no onboarding_completed flag; Archived = is_archived |
| DNA Assessment prompt on login | New modal in `DashboardLayout` and `CanvasserLayout` |
| Pre-filled DNA Assessment for logged-in users | New route `/dashboard/assessment` that skips Step 1 |

---

### 1. Database Changes

**New table: `contractor_files`**
Stores file metadata for uploaded files linked to a user's contractor profile.

```sql
CREATE TABLE public.contractor_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.contractor_files ENABLE ROW LEVEL SECURITY;
-- Admins can manage all files
CREATE POLICY "Admins can manage contractor files"
  ON public.contractor_files FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
-- Users can view their own files
CREATE POLICY "Users can view own contractor files"
  ON public.contractor_files FOR SELECT
  USING (user_id = auth.uid());
```

**New storage bucket: `contractor-files`** (private)
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('contractor-files', 'contractor-files', false);
-- Admins can upload
CREATE POLICY "Admins can upload contractor files"
  ON storage.objects FOR INSERT
  USING (bucket_id = 'contractor-files' AND has_role(auth.uid(), 'admin'::app_role));
-- Admins can read
CREATE POLICY "Admins can read contractor files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contractor-files' AND has_role(auth.uid(), 'admin'::app_role));
-- Users can read their own folder
CREATE POLICY "Users can read own contractor files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contractor-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**New column: `profiles.dna_assessment_pending`** (boolean, default false)
Used to trigger the DNA prompt on next login.

```sql
ALTER TABLE public.profiles ADD COLUMN dna_assessment_pending boolean DEFAULT false;
```

---

### 2. Tab Logic Redefinition

Replace the current 4-tab structure (All / Active / Onboarding / Archived) with 3 cleaner tabs:

| Tab | Filter Logic |
|---|---|
| **Active** | `is_archived = false` AND `has an account created` (default tab) |
| **Onboarding** | `is_archived = false` AND (`dna_assessment_pending = true` OR no DNA score on file) — i.e., hired but haven't completed assessment/onboarding |
| **Archived** | `is_archived = true` |

The summary stat cards at the top update to match (Active / Onboarding / Archived).

---

### 3. Contractor Profile Detail Sheet

Each contractor card gets an **"Open Profile"** button. Clicking it opens a `Sheet` (slide-out panel) with full details:

**Sheet sections:**
- **Header**: Name, roles/rank badges, hire date, DNA score badge
- **Performance Stats**: Revenue, Contracts, Leads, Points (Sales) OR Leads Set, Closed, Hours, Points (Canvasser)
- **DNA Assessment**: Full category breakdown using the existing `dnaCategories` / `getCategoryScore` logic from `dnaAssessment.ts` — identical view to `ApplicantDetail.tsx` but condensed
  - Score bar (color coded)
  - Per-category scores
  - Red flags + Positive indicators
  - If no assessment on file: shows "Assessment Pending" state with an "Assign DNA Assessment" button
- **Files**: List of uploaded files with download links + drag-and-drop upload zone (admin only)
- **Admin Notes**: Free-text notes field (saved to `job_applications.admin_notes` if hire record exists, or a new `contractor_notes` field)

---

### 4. "Assign DNA Assessment" → Login Prompt

**Replacing the "Send DNA Assessment" button:**

When an admin clicks "Assign DNA Assessment" on a contractor's profile:
1. It sets `profiles.dna_assessment_pending = true` for that user
2. On that user's next login (in `DashboardLayout` or `CanvasserLayout`), a new `DNAAssessmentPromptModal` appears
3. The modal routes them to `/dashboard/assessment` (a new protected route)

**Pre-filled Assessment page (`/dashboard/assessment`):**
- Skips "The Basics" step entirely — pulls name, email, phone, role from their authenticated session + `user_metrics` / `canvasser_metrics`
- Starts directly at the DNA Assessment questions (Step 2 of the public flow)
- On submit: creates a `job_applications` row with `created_user_id = auth.uid()`, `status = 'hired'`, pre-filled with their profile data
- After submit: sets `profiles.dna_assessment_pending = false`

---

### 5. Files Modified / Created

**Database Migrations (via migration tool):**
- Add `contractor_files` table with RLS
- Add `contractor-files` storage bucket with RLS
- Add `dna_assessment_pending` column to `profiles`

**New Files:**
- `src/components/admin/ContractorProfileSheet.tsx` — Full profile slide-out with DNA, stats, files
- `src/pages/dashboard/InternalAssessment.tsx` — Pre-filled DNA assessment for existing users

**Modified Files:**
- `src/pages/admin/ContractorManagement.tsx` — Use new 3-tab logic, wire "Open Profile" to sheet, replace "Send DNA Assessment" with "Assign Assessment"
- `src/pages/dashboard/DashboardLayout.tsx` — Add `DNAAssessmentPromptModal` check
- `src/pages/canvasser/CanvasserLayout.tsx` — Same prompt check for canvassers
- `src/App.tsx` — Add `/dashboard/assessment` and `/canvasser/assessment` routes

---

### Technical Notes

- File uploads use the Supabase Storage JS client: `supabase.storage.from('contractor-files').upload(path, file)`
- Signed URLs used for private file downloads: `supabase.storage.from('contractor-files').createSignedUrl(path, 3600)`
- DNA Assessment data in the profile sheet reads from `job_applications` where `created_user_id = user.id AND status = 'hired'` — same query already used in `ContractorManagement.tsx`
- The `dna_assessment_pending` flag is checked in the layout after auth loads, similar to how `WelcomeModal` and `GoalSettingModal` check their conditions
- The internal assessment page uses `useAuth()` to pre-populate name/email/phone, and fetches `desired_position` from their metrics rank to pre-set the position field
