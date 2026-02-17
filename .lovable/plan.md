

## Contractor Management CRM - Phase 1

This plan covers three major pieces: (1) fix the current build error, (2) add archive functionality to job applications, and (3) create a new "Contractor Management" page that serves as the foundation for a full Hire/Onboard/Train/Review CRM.

---

### 1. Fix Build Error (Critical - Blocking)

The `xlsx` package was removed from dependencies but `src/lib/reportGenerator.ts` still imports it. Replace the XLSX export in `reportGenerator.ts` with native CSV generation (same approach used for LeadExportButton).

Also fix the CSS `@import` order issue in `src/index.css` by moving the `@import` statements above the `@tailwind` directives.

---

### 2. Archive Applications

Add an "Archive" button to the FutureTeamMates list and ApplicantDetail page:

- **FutureTeamMates.tsx**: Add an archive button per application card, and add an "Archived" tab to toggle between active and archived applications
- **ApplicantDetail.tsx**: Add an "Archive" action button
- Both use the existing `archived` and `archived_at` columns already on the `job_applications` table

---

### 3. Contractor Management Page (New CRM Foundation)

Create a new admin page at `/admin/team` called "Contractor Management" that displays a profile card for every user in the system.

**What each profile shows:**
- Name, role(s), rank(s), current status (active/archived)
- Key performance stats pulled from `user_metrics` (for sales reps) or `canvasser_metrics` (for canvassers)
- Hire date (from `job_applications` if they were hired through the system)
- DNA Assessment score and alignment (if they have a linked job application)
- For users who never took the DNA assessment: a "Send DNA Assessment" button that copies a link to the `/apply` page

**Page sections/tabs:**
- **All Team** - Every user with their profile card
- **Onboarding** - Users hired within the last 30 days
- **Active Team** - All non-archived users
- **Archived** - Archived users

**Profile card details:**
- Name, roles (badges), ranks
- Hire date and start date (if available from job_applications)
- DNA score with alignment category (linked from job_applications by email match)
- YTD performance summary (revenue/points for sales, leads/points for canvassers)
- Quick actions: View full stats, Send DNA Assessment link

**No new database tables needed** - this page aggregates existing data from `profiles`, `user_roles`, `user_metrics`, `canvasser_metrics`, and `job_applications`.

---

### Technical Details

**Files to create:**
- `src/pages/admin/ContractorManagement.tsx` - The new CRM page

**Files to modify:**
- `src/index.css` - Fix @import order (move imports before @tailwind)
- `src/lib/reportGenerator.ts` - Replace `xlsx` import with native CSV
- `src/App.tsx` - Add route for `/admin/team`
- `src/pages/admin/AdminLayout.tsx` - Add "Contractor Management" nav item (with Users icon)
- `src/pages/admin/FutureTeamMates.tsx` - Add archive button and archived tab
- `src/pages/admin/ApplicantDetail.tsx` - Add archive action button

**Data flow for Contractor Management page:**
1. Fetch all profiles (with archive status)
2. Fetch all user_roles (to determine role badges)
3. Fetch user_metrics and canvasser_metrics (for performance stats)
4. Fetch job_applications where status = 'hired' (to match hire info to users via `created_user_id` column)
5. For users without a matching job application, show "Send DNA Assessment" option

This creates the foundation. Future phases would add: onboarding checklists, training modules, and quarterly review forms.

