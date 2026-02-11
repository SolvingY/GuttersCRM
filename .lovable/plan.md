

## Updates to Job Application System - Implementation Plan

Five changes to implement: lower word count, weighted DNA scoring (max 30), HTML PDF export, hire-to-onboard flow, and mobile "Apply Now" button fix.

---

### 1. Database Migration

Add new columns and change `dna_score` type:

```text
- ALTER dna_score from integer to numeric(5,1)
- Scale existing scores: SET dna_score = ROUND((dna_score / 20.0) * 30, 1) WHERE dna_score <= 20
- Update existing alignment_category values to new names
- Add columns: hired_at (timestamptz), created_user_id (uuid), start_date (date)
```

---

### 2. Weighted DNA Scoring (`src/lib/dnaAssessment.ts`)

Complete rewrite of scoring logic:

**Weight map:**
- Critical (3 pts): Q4, Q8, Q20
- High-value (2 pts): Q2, Q3, Q10, Q15, Q19
- Standard (1 pt): Q1, Q5, Q6, Q7, Q9, Q11, Q12, Q13, Q14, Q16, Q18
- Informational (0 pts): Q17
- Total: 30 points

**New `AlignmentCategory` type:** "Excellent Fit" | "Strong Fit" | "Moderate Fit" | "Marginal Fit" | "Low Fit"

**Updated functions:**
- `calculateDNAResult()` -- use weighted scoring, new thresholds, new categories
- `getCategoryScore()` -- return weighted earned/max per category (Performance=9, Consistency=3, Coaching=8, Teamwork=5, Leadership=5)
- `getScoreColor()` / `getScoreBarColor()` -- thresholds based on 30-point scale (24/18/12/6)
- `getAlignmentStars()` -- map new categories (Excellent=5, Strong=4, Moderate=3, Marginal=2, Low=1)

**New functions:**
- `getPositiveIndicators(answers)` -- returns string array of positive badges
- `getQuestionWeight(qId)` -- returns weight for display in breakdown

**Updated red flags:**
- Score < 12: "Low Cultural Fit"
- High-perf role + score < 18: "Role Mismatch"
- Q4=A: "External blame mindset (CRITICAL)"
- Q8=A: "Resistant to coaching (CRITICAL)"
- Q20=A: "Not aligned with excellence standard (CRITICAL)"
- 2+ critical A answers: "Multiple critical concerns"
- Sales + Q2=A + Q3=A: "May struggle with rejection and feedback"
- Admin + score > 24: "Consider sales/leadership roles - higher potential"

---

### 3. Lower Narrative Word Count (`src/pages/apply/JobApplication.tsx`)

- Lines 92-94: Change `< 100` to `< 25` (three checks)
- Line 278: Change instruction text "100 words" to "25 words"
- Lines 291-293, 307-309, 323-325: Change `/100` to `/25` and `>= 100` to `>= 25` in word counters

---

### 4. Score Display Updates

**`src/pages/admin/ApplicantDetail.tsx`:**
- Line 90: Change `/ 20` to `/ 30` in scorePercent
- Line 142: Change `/20` to `/30` in display
- Lines 181-183: Use weighted `getCategoryScore` (earned/total now weighted)
- Add positive indicators section (green badges) between score display and red flags (after line 159, before line 162)
- Add `generateHTMLReport()` function with full HTML template including all 5 category breakdowns, 20 questions with weight markers, color coding
- Add "Export to PDF" button in actions section
- Replace "Move to Hired" button (line 260-262) with HireApplicantDialog trigger
- Import `getPositiveIndicators`, `getQuestionWeight` from dnaAssessment

**`src/pages/admin/FutureTeamMates.tsx`:**
- Line 152: Change alignment filter options from old categories to "Excellent Fit", "Strong Fit", "Moderate Fit", "Marginal Fit", "Low Fit"
- Line 192: Change `/20` to `/30`

**`src/components/admin/NewApplicantsModal.tsx`:**
- Line 63: Change `/20` to `/30`

---

### 5. Positive Indicators Display (`src/pages/admin/ApplicantDetail.tsx`)

Insert between alignment/score display and red flags:
- Compute `positiveIndicators` from `getPositiveIndicators(answers)`
- Display as green badges: background `#dcfce7` (bg-green-50), text `#166534` (text-green-800), rounded with left border
- Format: checkmark icon + indicator text (e.g., "Strong cultural alignment")

---

### 6. HTML PDF Export (`src/pages/admin/ApplicantDetail.tsx`)

Add `generateHTMLReport()` function that:
- Builds complete HTML with inline CSS
- Includes: header (red bg, name, date), basic info, position, DNA score with gauge, positive indicators (green badges), red flags (red badges), all 5 category breakdowns with each question showing answer + weight marker ("[2 pts]", "CRITICAL - 3 pts"), all 3 narratives, admin notes, interview notes
- Opens in new tab via `window.open()`
- Includes print button and `@media print` styles

Add "Export to PDF" button in the actions section.

---

### 7. Hire-to-Onboard Flow

**New file: `src/components/admin/HireApplicantDialog.tsx`**

Dialog with:
- Pre-filled email, name, phone from application
- Role dropdown mapping: Sales -> sales_rep, Canvassing -> canvasser, Admin -> admin_only, Management -> super_admin, Production/Service -> sales_rep
- Auto-generated 12-char temp password with copy button
- Start date picker
- On submit: calls existing `create-user` edge function, updates job_applications (status='hired', hired_at, created_user_id, start_date)
- Success toast

**Note:** The existing `create-user` edge function does NOT send welcome emails. This can be added as a future enhancement. The admin will need to manually share the temp password with the new hire.

**`src/pages/admin/ApplicantDetail.tsx`:**
- Import and add state for HireApplicantDialog
- Replace "Move to Hired" button with dialog trigger
- Render dialog component

---

### 8. Mobile "Apply Now" Button Fix (`src/components/TeamSection.tsx`)

Lines 298-313: Wrap both buttons in `flex flex-col sm:flex-row gap-3` container. Remove `ml-3` from Apply Now link. Add `w-full sm:w-auto`, `min-h-[44px]`, `touch-manipulation`, and `text-center` to both buttons for proper mobile stacking and touch targets.

---

### Files Summary

| File | Action |
|------|--------|
| Database migration | dna_score type, scale data, update categories, add hire columns |
| `src/lib/dnaAssessment.ts` | Weighted scoring, new categories, positive indicators, updated red flags |
| `src/pages/apply/JobApplication.tsx` | Word count 100 to 25 |
| `src/pages/admin/ApplicantDetail.tsx` | Score /30, positive indicators, HTML export, hire dialog |
| `src/pages/admin/FutureTeamMates.tsx` | Score /30, alignment filter options |
| `src/components/admin/NewApplicantsModal.tsx` | Score /30 |
| `src/components/admin/HireApplicantDialog.tsx` | **New** -- create user on hire |
| `src/components/TeamSection.tsx` | Mobile button layout fix |

