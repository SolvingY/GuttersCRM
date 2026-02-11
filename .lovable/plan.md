

## Job Application System with DNA Assessment -- Full Implementation Plan

This feature adds a public job application form with a 20-question cultural fit assessment, automated scoring with red flag detection, and a full admin dashboard for reviewing applicants.

---

### Database: New `job_applications` Table

**Columns:**

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | UUID PK | gen_random_uuid() | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |
| full_name | text | NOT NULL | |
| email | text | NOT NULL | |
| phone | text | NOT NULL | |
| current_job_title | text | nullable | |
| desired_position | text | NOT NULL | |
| years_experience | text | NOT NULL | |
| availability | text | NOT NULL | |
| dna_answers | jsonb | NOT NULL | {q1:"A", q2:"B", ...q20} |
| dna_score | integer | NOT NULL | 0-20 |
| alignment_category | text | NOT NULL | High/Mid/Support/Low Fit |
| recommended_role | text | | Calculated |
| red_flags | jsonb | '[]' | Array of flag strings |
| narrative_ownership | text | NOT NULL | Min 100 words |
| narrative_mentor | text | NOT NULL | Min 100 words |
| narrative_why_ngr | text | NOT NULL | Min 100 words |
| status | text | 'new' | new/reviewed/contacted/rejected/hired |
| status_changed_by | UUID | nullable | Admin who last changed status |
| status_changed_at | timestamptz | nullable | When status last changed |
| admin_notes | text | nullable | |
| interview_notes | text | nullable | Placeholder for future calendar |
| reviewed_by | UUID | nullable | |
| reviewed_at | timestamptz | nullable | |
| contacted_at | timestamptz | nullable | |
| archived | boolean | false | |
| archived_at | timestamptz | nullable | |

**RLS Policies:**
- Anyone can INSERT (public application form, no auth required)
- Only admins can SELECT, UPDATE, DELETE

**Trigger:** `update_updated_at_column` on UPDATE (reuse existing function)

---

### DNA Assessment Data (`src/lib/dnaAssessment.ts`)

Contains all 20 questions with full A/B text, organized into 5 category groups:

**Category 1: Performance Mindset (Q1, Q2, Q3, Q4, Q5)**
- Q1: Steady environment (A) vs High-speed rewards (B)
- Q2: Step back at walls (A) vs Aggressive problem-solving (B)
- Q3: Sensitive feedback (A) vs Brutal truth (B)
- Q4: External blame (A) vs Full accountability (B)
- Q5: Show up on time (A) vs Show up early with plan (B)

**Category 2: Consistency and Commitment (Q6, Q13, Q14, Q17)**
- Q6: Energy matches office vibe (A) vs Same intensity daily (B)
- Q13: Strict 9-to-5 (A) vs Stay until done (B)
- Q14: Trust earned slowly (A) vs Reliability = trust (B)
- Q17: Single-task focus (A) vs Multiple projects/chaos (B)

**Category 3: Coaching and Growth (Q7, Q8, Q12, Q15, Q18)**
- Q7: Step-by-step guide (A) vs Figure it out (B)
- Q8: Stick to my system (A) vs Constantly seek better ways (B)
- Q12: Follow instructions (A) vs Self-starter (B)
- Q15: Avoid mistakes (A) vs Own mistakes loudly (B)
- Q18: Motivated by stability (A) vs Motivated by growth (B)

**Category 4: Teamwork and Culture (Q9, Q10, Q11, Q16)**
- Q9: Silo worker (A) vs Gap worker (B)
- Q10: Fix before telling (A) vs Flag immediately (B)
- Q11: Avoid difficult conversations (A) vs High standards (B)
- Q16: Want to be liked (A) vs Want to be respected (B)

**Category 5: Leadership Potential (Q19, Q20)**
- Q19: Happy as player (A) vs Want to lead (B)
- Q20: Looking for a job (A) vs Looking for excellence (B)

**Scoring:**
- Each B = 1 point, A = 0. Max = 20.
- 16-20: "High Performance" (Sales, Canvassing, Management)
- 11-15: "Mid Performance" (Production, Service, some Sales)
- 6-10: "Support" (Admin, Production supervised)
- 0-5: "Low Fit" (Not recommended)

**Red Flag Detection:**
- Score < 6: "Low Cultural Fit"
- Sales/Canvassing/Management desired with score < 11: "Role Mismatch"
- Q4 = A: "External blame mindset"
- Q8 = A: "Resistant to coaching"
- Q20 = A: "Not aligned with excellence standard"

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/dnaAssessment.ts` | All 20 questions, category groups, scoring, role mapping, red flag logic |
| `src/pages/apply/JobApplication.tsx` | Multi-step form (intake, DNA, narrative, confirmation) |
| `src/pages/apply/ApplicationThankYou.tsx` | NGR story page with leadership, values, social links |
| `src/pages/admin/FutureTeamMates.tsx` | Admin list view with stats, filters, export |
| `src/pages/admin/ApplicantDetail.tsx` | Individual applicant view with DNA breakdown, notes, actions |
| `src/components/admin/NewApplicantsModal.tsx` | Login notification modal for new applications |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add routes: `/apply`, `/apply/thank-you`, `/admin/applicants`, `/admin/applicants/:id` |
| `src/pages/admin/AdminLayout.tsx` | Add "Future Team Mates" nav item with notification badge + bell dropdown |
| `src/components/TeamSection.tsx` | Add "Apply Now" button BELOW the existing "Send Your Resume" link |

---

### Public Application Form (`/apply`)

**Step 1 - The Intake:**
- Full Name, Email (validated), Phone (formatted), Current Job Title
- Desired Position dropdown (Sales-Residential, Sales-Commercial, Sales-Gutters, Canvassing, Admin, Management, Production, Service)
- Years of Experience radios (0-1, 2-5, 5-10, 10+)
- Availability radios (Immediate, 2 Weeks, 1 Month)

**Step 2 - DNA Assessment:**
- Instructions header explaining the assessment
- All 20 forced-choice A/B questions displayed as radio buttons
- All must be answered to proceed
- Progress indicator shows completion

**Step 3 - Narrative:**
- Three text areas with 100-word minimum validation and live word count
- Topics: Ownership Standard, Mentor Mindset, "Next Gen" Why
- Full question prompts displayed above each field

**Step 4 - Confirmation:**
- Green checkmark with "Application Submitted!" message
- Auto-redirect to thank-you page after 3 seconds
- "Continue to Learn More About NGR" button

**Step 5 - Thank You Page (`/apply/thank-you`):**
- "Welcome to the Next Generation" header
- Who We Are section (Veteran-Operated, Oklahoma Roots, Proven Scale)
- Leadership Team profiles (Rob, Jonathan, Kara, Matt Fowler)
- Core Values (Growth, Excellence, Humility, Reputation)
- Social links (Facebook, Instagram)
- "Return to Home" button

---

### Admin Dashboard: Future Team Mates

**Navigation:** New "Future Team Mates" tab with Briefcase icon at `/admin/applicants`. Shows red notification badge with count of applications with status = 'new'.

**Notification Bell (in AdminLayout header):**
- Bell icon with red badge showing count of new applications
- Dropdown shows list of recent new applicants: name, desired role, DNA score
- "View All Applications" link at bottom

**Login Notification Modal (`NewApplicantsModal.tsx`):**
- Appears when admin logs in and there are new (unreviewed) applications
- Shows count and list: name, alignment category, DNA score
- "Review Now" button navigates to Future Team Mates
- "Dismiss" button closes modal
- Only shows once per session (tracked via sessionStorage)

**List View (`FutureTeamMates.tsx`):**
- Top stats bar: New / Reviewed / Contacted / Hired counts
- Filter bar: Status, Role, Alignment Category, Date Range, Sort By
- Export buttons: CSV and PDF
- Applicant cards with: name, date, DNA score, desired role, recommended fit, alignment stars, status badge (color-coded: red=new, yellow=reviewed, green=contacted, gray=rejected, blue=hired)
- Action buttons on each card: View Full Application, Mark as Reviewed, Contact

**Detail View (`ApplicantDetail.tsx`):**
- Full applicant profile header with status dropdown
- Basic Info section (name, email, phone, current title)
- Position and Experience section
- DNA Assessment section with:
  - Overall score with visual progress bar/gauge (green 16-20, yellow 11-15, orange 6-10, red 0-5)
  - Alignment category with star rating
  - Recommended role and match indicator
  - Red flags displayed as warning badges
  - Expandable detailed breakdown grouped by category (Performance Mindset, Consistency, Coaching, Teamwork, Leadership) showing each question with the applicant's answer marked
- Narrative responses displayed in full
- Admin Notes text area with Save button
- Interview Notes text area with "Calendar integration coming soon" note and Save button
- Action buttons: Send Email (mailto), Mark as Contacted, Move to Hired, Reject
- Back to All Applicants link

---

### Export Details

**CSV Export includes:**
Name, Email, Phone, Applied Date, Current Job Title, Desired Position, Years Experience, Availability, DNA Score, Alignment Category, Recommended Role, Status, Red Flags

**PDF Export includes:**
- Applicant summary page (basic info + position)
- Full DNA assessment results with category breakdown
- All 3 narrative responses in full
- Admin notes
- Red flags section

Both use existing `xlsx` and `jspdf`/`jspdf-autotable` libraries already installed.

---

### Auto-Archive

Database function `archive_old_applications()` that sets `archived = true` for applications older than 30 days where status is NOT 'hired' or 'contacted'. Admin list view filters out archived by default with option to show them.

---

### TeamSection.tsx Change

Add an "Apply Now" button BELOW the existing "Send Your Resume" mailto link (not replacing it). The new button links to `/apply` and uses a Link from react-router-dom.

---

### Implementation Sequence

1. Database migration (create table + RLS + trigger)
2. `src/lib/dnaAssessment.ts` (questions, scoring, red flags)
3. Public form pages (`JobApplication.tsx`, `ApplicationThankYou.tsx`)
4. Admin pages (`FutureTeamMates.tsx`, `ApplicantDetail.tsx`, `NewApplicantsModal.tsx`)
5. Route wiring (`App.tsx`)
6. Admin nav + notifications (`AdminLayout.tsx`)
7. "Apply Now" button (`TeamSection.tsx`)

