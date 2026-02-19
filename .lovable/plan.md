

# Gutter Estimating Calculator - Full Implementation Plan

## Step 1: Database Migration

Create the `gutter_estimates` table with RLS policies:
- References `quote_requests(id)` via `lead_id` foreign key
- `created_by` defaults to `auth.uid()`
- RLS: users see/insert/update own estimates, admins manage all
- Columns for all pricing sections (protection, gutters, downspouts, add-ons) plus totals, quoted price, and commission
- `measurement_data` JSONB column stores raw row/elbow/addon data

## Step 2: Create NGRGutterCalculator Component

**New file:** `src/components/NGRGutterCalculator.tsx`

Full TypeScript conversion of the provided calculator with:
- `lead` prop typed as `{ id?: string; full_name?: string; city?: string; state?: string; reference_number?: string; ... } | null`
- `onSave` prop typed as `(estimate: Record<string, unknown>) => void`
- All pricing constants, calculation functions (`calcRowTotals`, `calcSection`, story upcharges, corner adders, premium surcharge) preserved exactly
- Three tabs: Protection, Gutters & Downspouts, Add-Ons
- Measurement tables, downspout/elbow grids, add-on grid
- Summary with retail/floor/quoted/commission breakdown and slider
- Save uses `supabase.from("gutter_estimates").insert()` with `created_by` set to `user.id` from `useAuth()`
- Print and Clear buttons
- Inline styles for self-contained dark theme

## Step 3: Create Standalone Estimator Page

**New file:** `src/pages/dashboard/GutterEstimator.tsx`

Simple wrapper rendering `<NGRGutterCalculator />` without a lead prop.

## Step 4: Add Route and Sidebar Nav

**Modified:** `src/App.tsx`
- Import `GutterEstimator`
- Add route `<Route path="estimator" element={<GutterEstimator />} />` under `/dashboard`

**Modified:** `src/components/dashboard/DashboardSidebar.tsx`
- Import `Calculator` icon from lucide-react
- Add nav item `{ icon: Calculator, label: 'Estimator', path: '/dashboard/estimator' }` after the "My Leads" item

## Step 5: Integrate into Sales Rep Lead Detail

**Modified:** `src/pages/dashboard/LeadDetailView.tsx`
- Add `showCalculator` state toggle
- Add "Open Estimator" button near the header
- Render `NGRGutterCalculator` in a collapsible section with close button, passing lead data mapped as:
  - `lead.full_name` -> customer name
  - `lead.city`, `lead.state` -> location
  - `lead.reference_number` -> job number
  - `lead.id` -> lead_id
- Add "Past Estimates" section querying `gutter_estimates` where `lead_id = lead.id`
- Show "No estimates yet" empty state when none exist
- Format all currency with `$` and 2 decimal places

## Step 6: Add Estimates to Admin Lead Detail

**Modified:** `src/pages/admin/LeadDetail.tsx`
- Add read-only "Saved Estimates" section below the activity log
- Query `gutter_estimates` by `lead_id`
- Display table: Date, Quoted Price, Floor, Commission
- Show "No estimates yet" empty state
- All currency formatted with `$` and 2 decimals

## Files Summary

| Type | File | Description |
|---|---|---|
| Migration | `gutter_estimates` table | Database table + RLS |
| New | `src/components/NGRGutterCalculator.tsx` | Core calculator component |
| New | `src/pages/dashboard/GutterEstimator.tsx` | Standalone page wrapper |
| Modified | `src/App.tsx` | Add estimator route |
| Modified | `src/components/dashboard/DashboardSidebar.tsx` | Add Estimator nav item |
| Modified | `src/pages/dashboard/LeadDetailView.tsx` | Calculator integration + past estimates |
| Modified | `src/pages/admin/LeadDetail.tsx` | Read-only estimates list |

