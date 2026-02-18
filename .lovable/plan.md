

# Supplementer Profile & Tracking System - Full Implementation Plan

This is a major feature adding a new "Supplementer" role for insurance supplement specialists, with a dedicated portal, job tracking, points-based leaderboard, and admin integration. It follows all existing patterns for Sales Reps and Canvassers.

---

## Phase 1: Database Migration

A single migration will create all tables, triggers, RLS policies, and enum extension.

### 1A. Extend `app_role` enum
Add `'supplementer'` to the existing enum used by `user_roles`.

### 1B. Create `supplementer_metrics` table
Cumulative/YTD metrics per supplementer:
- `user_id` (unique), `display_name`, `yearly_goal` (NUMERIC, default 100000)
- Financial: `total_rcv_increased`, `total_money_collected`, `total_supplements_processed`
- Timing averages: `avg_coc_completion_days`, `avg_depreciation_release_days`, `avg_code_release_days`, `avg_revised_scope_days`
- Calculated: `efficiency_score`, `collection_rate`
- Points: `points` (INTEGER), `coc_bonus_points` (INTEGER)
- Weekly tracking: `supplements_this_week`, `rcv_increased_this_week`, `money_collected_this_week`
- Weekly reset: `last_weekly_reset` (TIMESTAMPTZ)

### 1C. Create `supplement_jobs` table
Individual job tracking with API-ready fields:
- Job info: `job_number`, `client_name`, `property_address`, `insurance_carrier`, `claim_number`
- Assignment: `supplementer_id`, `assigned_at`
- Financials: `original_rcv`, `statement_of_loss_rcv`, `rcv_increase` (computed column: `statement_of_loss_rcv - original_rcv`), `depreciation_amount`, `code_upgrade_amount`, `money_collected`, `collection_date`
- Timing milestones: `coc_completed_at`, `depreciation_released_at`, `code_released_at`, `revised_scope_received_at` with auto-calculated day counts
- Points: `coc_bonus_points` (INTEGER, per-job speed bonus)
- Status: `active`, `coc_pending`, `depreciation_pending`, `completed`, `closed`
- API-ready fields: `external_job_id`, `external_claim_id`, `external_sync_status`, `last_synced_at`, `sync_error`, `updated_via` (default 'manual')
- Audit: `notes`, `created_by`, `last_modified_by`

### 1D. Create `weekly_supplementer_metrics` table
Weekly snapshots for leaderboard:
- `user_id`, `week_start`, `week_end`
- `supplements_completed`, `rcv_increased`, `money_collected`
- Timing averages, `display_name`
- `points_earned` (INTEGER)

### 1E. Database Triggers

1. **`calculate_supplement_days`** (BEFORE UPDATE on `supplement_jobs`):
   - Auto-calculates day counts when milestone dates are entered
   - Calculates COC bonus points: 5 pts for <=7 days, 3 pts for 8-10, 1 pt for 11-14, 0 for 15+

2. **`update_supplementer_metrics`** (AFTER UPDATE on `supplement_jobs`):
   - When job marked `completed`, updates cumulative totals
   - Recalculates total points: `floor(total_rcv / 1000) + floor(total_collected / 2000) + total_coc_bonus`
   - Updates timing averages and collection rate

3. **`create_supplementer_metrics`** (AFTER INSERT on `user_roles`):
   - Auto-creates `supplementer_metrics` row when user gets the supplementer role

### 1F. RLS Policies
- **Admins**: full ALL access on all 3 new tables
- **Supplementers**: SELECT own data, INSERT/UPDATE own jobs
- **Leaderboard**: public SELECT on metrics tables (authenticated users)

### 1G. Add `supplementer_rcv_goal` column to `company_goals`
New NUMERIC(12,2) column with default 500000.

### 1H. Data Validation Constraints
- Positive RCV amounts: `original_rcv >= 0 AND statement_of_loss_rcv >= 0`
- Non-empty carrier: `insurance_carrier IS NULL OR insurance_carrier != ''`

---

## Phase 2: Auth & Routing Updates

### 2A. Update `src/hooks/useAuth.ts`
- Extend `AppRole` type union: `'admin' | 'user' | 'canvasser' | 'supplementer'`
- Add computed properties:
  - `hasSupplementerRole`: `roles.includes('supplementer')`
  - `isSupplementerOnly`: has supplementer but not user/canvasser/admin roles

### 2B. Update `src/components/auth/ProtectedRoute.tsx`
- Add `requireSupplementer` prop
- Redirect supplementer-only users from `/dashboard` and `/canvasser` to `/supplementer`
- Allow dual-role users to access multiple portals

### 2C. Update `src/App.tsx`
Add new route group (following canvasser pattern):
```
/supplementer              -> SupplementerLayout
  /supplementer/stats      -> SupplementerDashboard
  /supplementer/leaderboard
  /supplementer/jobs
  /supplementer/jobs/:id
  /supplementer/settings
```

---

## Phase 3: Supplementer Portal (8 New Files)

### 3A. `src/pages/supplementer/SupplementerLayout.tsx`
Following `CanvasserLayout.tsx` pattern exactly: sidebar + DashboardHeader + Outlet + login tracking + watermark logo.

### 3B. `src/components/supplementer/SupplementerSidebar.tsx`
Following `CanvasserSidebar.tsx` pattern with nav items:
- My Stats (`/supplementer/stats`)
- Leaderboard (`/supplementer/leaderboard`)
- Jobs (`/supplementer/jobs`)
- Settings (`/supplementer/settings`)

### 3C. `src/pages/supplementer/SupplementerDashboard.tsx`
- **Primary KPI: Total Points** (large, prominent) with breakdown: RCV Points + Collection Points + Speed Bonus
- Secondary KPIs: Total RCV Increased, Supplements Processed, Money Collected, Collection Rate
- Timing cards: Avg COC Days, Avg Depreciation Days, Avg Code Release Days
- Active jobs list (5 most recent)
- "Add New Supplement Job" button

### 3D. `src/pages/supplementer/SupplementerLeaderboard.tsx`
- Weekly/Monthly/YTD tabs
- Sorted by Points (descending) with tiebreakers: RCV Increased, Collection Rate, Avg COC Days
- Columns: Rank, Name, Points (bold), RCV Increased, Collected, Avg COC Days
- Points explanation tooltip showing the formula

### 3E. `src/pages/supplementer/SupplementerJobsList.tsx`
Table of all jobs with status filters, date range, click-to-detail.

### 3F. `src/pages/supplementer/SupplementerJobDetail.tsx`
Full job editing form:
- Job info (client, property, insurance, claim number)
- Financial metrics (original RCV, statement RCV, auto-calculated increase)
- Timing milestones with date pickers
- COC Speed Bonus display: shows bonus points earned with trophy icon
- Notes, Save button

### 3G. `src/pages/supplementer/SupplementerSettings.tsx`
Display name update (following `CanvasserSettings.tsx` pattern).

### 3H. `src/components/admin/EditSupplementerMetricsModal.tsx`
Admin modal: yearly goal editable, points breakdown read-only (RCV Points + Collection Points + Speed Bonus = Total).

---

## Phase 4: Admin Integration

### 4A. `src/pages/admin/AdminLeaderboards.tsx`
- Change inner TabsList from `grid-cols-2` to `grid-cols-3`
- Add "Supplementers" TabsTrigger
- Add supplementer state variables and data fetching (YTD from `supplementer_metrics`, weekly/monthly from `weekly_supplementer_metrics`)
- Subscribe to realtime changes on `supplementer_metrics` and `weekly_supplementer_metrics`
- Sort by points descending; columns: Rank, Name, Points, RCV Increased, Collected, Avg COC Days

### 4B. `src/pages/dashboard/AdminOverview.tsx`
- Change TabsList from 2 to 3 columns
- Add "Supplementers" tab with:
  - Aggregate stats cards (Total RCV, Total Collected, Avg Collection Rate, Avg COC Days)
  - Table of all supplementers with edit button
- Wire up `EditSupplementerMetricsModal`

### 4C. `src/components/dashboard/RoleViewToggle.tsx`
Extend for users who may have supplementer + other roles. Add supplementer portal toggle option.

---

## Phase 5: System Integration

### 5A. Report Export (`src/lib/reportGenerator.ts`)
- Add `SupplementerData` interface with `points` field
- Add supplementer section to both CSV and PDF exports
- Update `CompanySummary` with supplementer aggregates
- Column order: Name, Points, RCV Increased, Money Collected, Collection Rate, Supplements Processed, Avg COC Days

### 5B. Company Goals (`src/pages/admin/CompanyGoals.tsx`)
- Add `supplementer_rcv_goal` to `CompanyGoal` interface
- Add supplementer RCV goal input field in the goals form
- Display progress against goal

### 5C. Job Application (`src/components/admin/HireApplicantDialog.tsx`)
- Add `'Supplementer': 'supplementer'` and `'Insurance Specialist': 'supplementer'` to `ROLE_MAPPING`

### 5D. `supabase/functions/create-user/index.ts`
- Add `'supplementer'` case to `getRoleConfig`:
  ```
  case 'supplementer':
    return { roles: ['supplementer'], createSalesMetrics: false, createCanvasserMetrics: false };
  ```
- Add supplementer metrics creation logic (following canvasser pattern): check if `config.createSupplementerMetrics`, then upsert into `supplementer_metrics`

### 5E. Invite Users (`src/pages/dashboard/InviteUsers.tsx`)
- Add `'supplementer'` as a role option in the invite role dropdown
- Add supplementer option to manual user creation role type select

---

## Points System Summary

**Formula:**
```
Total Points = floor(total_rcv_increased / 1000)
             + floor(total_money_collected / 2000)
             + sum(coc_bonus_points)
```

**COC Speed Bonus (per job):**
- 7 days or less = 5 bonus points
- 8-10 days = 3 bonus points
- 11-14 days = 1 bonus point
- 15+ days = 0 bonus points

**Ranking:** Primary: Points DESC. Tiebreakers: RCV Increased DESC, Collection Rate DESC, Avg COC Days ASC.

---

## Files Summary

### New Files (8)
| File | Description |
|---|---|
| `src/pages/supplementer/SupplementerLayout.tsx` | Layout with sidebar, header, outlet, login tracking |
| `src/pages/supplementer/SupplementerDashboard.tsx` | Stats dashboard with points as primary KPI |
| `src/pages/supplementer/SupplementerLeaderboard.tsx` | Points-ranked leaderboard with weekly/monthly/YTD |
| `src/pages/supplementer/SupplementerJobsList.tsx` | Jobs list with status filters |
| `src/pages/supplementer/SupplementerJobDetail.tsx` | Job detail/edit with COC bonus display |
| `src/pages/supplementer/SupplementerSettings.tsx` | Display name settings |
| `src/components/supplementer/SupplementerSidebar.tsx` | Sidebar navigation |
| `src/components/admin/EditSupplementerMetricsModal.tsx` | Admin edit modal with points breakdown |

### Modified Files (10)
| File | Changes |
|---|---|
| `src/hooks/useAuth.ts` | Add supplementer role type and checks |
| `src/components/auth/ProtectedRoute.tsx` | Add supplementer routing logic |
| `src/App.tsx` | Add supplementer route group |
| `src/pages/admin/AdminLeaderboards.tsx` | Add Supplementers tab (3-col grid), data fetching, realtime |
| `src/pages/dashboard/AdminOverview.tsx` | Add Supplementers tab + data fetching |
| `src/lib/reportGenerator.ts` | Add SupplementerData interface + export section |
| `src/pages/admin/CompanyGoals.tsx` | Add supplementer RCV goal field |
| `src/components/admin/HireApplicantDialog.tsx` | Add supplementer role mapping |
| `src/pages/dashboard/InviteUsers.tsx` | Add supplementer as invite/create role option |
| `supabase/functions/create-user/index.ts` | Add supplementer role config + metrics creation |

### Database Migration
1. `ALTER TYPE app_role ADD VALUE 'supplementer'`
2. `CREATE TABLE supplementer_metrics` (with points columns + RLS)
3. `CREATE TABLE supplement_jobs` (with API-ready fields, computed column, RLS, triggers)
4. `CREATE TABLE weekly_supplementer_metrics` (with points_earned + RLS)
5. `ALTER TABLE company_goals ADD COLUMN supplementer_rcv_goal`
6. Create 3 triggers (timing calc with COC bonus, metrics update with points calc, auto-create metrics)
7. Validation constraints on supplement_jobs
8. Indexes for performance

---

## Implementation Order

Due to the size, this will be implemented in stages within a single approval:

1. Database migration (all tables, triggers, RLS, constraints)
2. Auth updates (useAuth, ProtectedRoute)
3. Routing (App.tsx)
4. Supplementer portal UI (Layout, Sidebar, Dashboard, Leaderboard, Jobs, JobDetail, Settings)
5. Admin integration (Leaderboards tab, Overview tab, EditSupplementerMetricsModal)
6. System integration (create-user edge function, report export, company goals, hire dialog, invite users)

