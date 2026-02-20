

# Batch 1: Database Foundation + Contractor Profile Enhancements

## Summary
Add extended personal/contract fields to profiles, create a document categorization system, enhance performance reviews with granular scoring, and update the Contractor Profile UI. Create three new components: Upcoming Birthdays widget, Enhanced Performance Review Form, and Profile PDF Export. All terminology uses independent contractor language throughout.

---

## Phase 1: Database Migration

A single migration with the following changes:

### 1.1 Extend `profiles` table
Add 16 new columns (all nullable so existing data is unaffected):

- phone, birthday, start_date (contract start), street_address, city, state (default 'Oklahoma'), zip_code
- emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
- compensation_type ('hourly', 'retainer', 'commission', 'profit_split')
- hourly_rate, retainer_annual, commission_percentage, profit_split_percentage
- manager_id (plain UUID, no FK to auth.users)
- Indexes on manager_id, start_date DESC, birthday

Note: The existing `profiles` UPDATE RLS policy only allows users to update their own profile. A new admin update policy will be added so admins can edit contractor profiles.

### 1.2 Create `contractor_document_categories` table
- Columns: id, name (unique), description, requires_admin_upload, icon, sort_order, created_at
- RLS: admin ALL + authenticated SELECT
- Seeded with 7 categories: W9, Banking, Contracts, Offer Letters, Performance Reviews, Certifications, Other
- Descriptions use independent contractor language (e.g., "Independent contractor agreements")

### 1.3 Extend `contractor_files` table
New columns: category_id (FK), is_sensitive, requires_signature, signed_at, signed_by, description
Indexes on category_id and (user_id, category_id)

### 1.4 Extend `performance_reviews` table
New columns:
- 6 score columns: communication_score, productivity_score, quality_score, teamwork_score, reliability_score, customer_service_score (integer 1-5)
- strengths, areas_for_improvement (text)
- manager_signature, contractor_signature (text)
- contractor_acknowledged_at (timestamptz)

Two triggers:
1. `validate_review_scores` -- ensures scores are between 1-5 (validation trigger, not CHECK constraint)
2. `calculate_overall_rating` -- auto-computes overall_rating as ROUND(AVG(non-null scores))

---

## Phase 2: UI Updates

### 2.1 Update `ContractorProfileSheet.tsx` (921 lines)

**New sections inserted after the header, before Performance Stats:**

**Personal Information Section:**
- Phone, Birthday (date picker), Street Address, City, State, Zip Code
- Emergency Contact: Name, Phone, Relationship
- All fields save via a Save button
- Data fetched/updated on the `profiles` table

**Contract Information Section:**
- Contract Start Date (date picker) -- labeled "Contract Start Date"
- Manager (dropdown populated from profiles joined with user_roles where role = 'admin')
- Compensation Type dropdown: Hourly, Retainer, Commission, Profit Split
- Conditional amount field based on type (hourly_rate, retainer_annual, commission_percentage, profit_split_percentage)

**Enhanced Documents Section:**
- Fetch categories from `contractor_document_categories`
- Category filter dropdown above file list
- Group files by category in collapsible accordions
- Category badge on each file, lock icon for sensitive files
- Upload dialog includes category dropdown

**Enhanced Performance Reviews Section:**
- Replace single overall_rating star input with 6 category star ratings
- Auto-display computed overall (read-only, calculated by DB trigger)
- Add Strengths and Areas for Improvement textareas
- Manager signature field (typed name)
- Contractor Acknowledgement section (checkbox + typed signature)
- Review history cards show category score breakdown

**Header updates:**
- Replace "Hired:" label with "Contract Start:" using `start_date` from profiles
- Add PDF export button

### 2.2 Update `ContractorManagement.tsx` (606 lines)
- Extend profiles query to fetch new columns (phone, birthday, start_date, etc.)
- Pass extended data to ContractorProfileSheet
- Update card display: replace "Hired:" with "Contract Start:" using start_date from profiles

### 2.3 Update `ContractorUser` interface
- Replace `hireDate` with data from job_applications (keep for backward compat)
- Add `startDate` from profiles table (contract start date)
- Add all new profile fields for the sheet to consume

---

## Phase 3: New Components

### 3.1 `src/components/admin/UpcomingBirthdays.tsx`
- Card showing "Upcoming Team Member Birthdays" for next 30 days
- Fetches from profiles where birthday is not null
- Month/day comparison logic for upcoming birthday detection
- Displays name + formatted date

### 3.2 `src/components/admin/PerformanceReviewForm.tsx`
- Extracted, reusable review form component
- 6 star rating inputs (Communication, Productivity, Quality, Teamwork, Reliability, Customer Service)
- Auto-displayed overall rating
- Textareas for strengths, improvements, goals, action items
- Manager signature field
- Contractor acknowledgement section
- Used inline by ContractorProfileSheet

### 3.3 `src/components/admin/ProfilePDFExport.tsx`
- Export button for ContractorProfileSheet header
- Uses jspdf + jspdf-autotable to generate PDF
- Title: "Contractor Profile: {Name}"
- Sections: Personal Info, Contract Info, Performance Metrics, DNA Assessment, Review History, Documents on File
- Downloads as `{Name}_Contractor_Profile.pdf`

---

## Files Changed

| File | Action |
|---|---|
| Database migration | New -- extend profiles, create contractor_document_categories, extend contractor_files, extend performance_reviews, add triggers, add admin update policy on profiles |
| `src/components/admin/ContractorProfileSheet.tsx` | Edit -- add Personal Info, Contract Info sections; enhance Documents with categories; enhance Reviews with 6 scores + contractor terminology |
| `src/pages/admin/ContractorManagement.tsx` | Edit -- fetch new profile fields, update card labels to contractor terminology |
| `src/components/admin/PerformanceReviewForm.tsx` | New -- extracted enhanced review form |
| `src/components/admin/UpcomingBirthdays.tsx` | New -- birthday widget |
| `src/components/admin/ProfilePDFExport.tsx` | New -- PDF export component |

---

## Technical Notes

- `manager_id` is a plain UUID (no FK to auth.users per project rules)
- Score validation uses BEFORE INSERT/UPDATE triggers, not CHECK constraints
- `calculate_overall_rating` trigger computes `ROUND(AVG(non-null scores))` automatically
- All new profile columns are nullable -- no impact on existing data
- A new RLS policy on `profiles` allows admins to update any profile (currently only self-update is allowed)
- Existing `contractor_files` RLS unchanged; new columns are metadata only
- All UI text uses independent contractor terminology: "Contract Start Date", "Retainer", "Contractor Signature", "Contractor Acknowledgement" -- never "employee", "hire date", or "salary"

