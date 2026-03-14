

# Admin "All Estimates" Page

## What It Does
A new admin page at `/admin/estimates` showing every gutter estimate (and future estimate types) across all reps and leads, with filtering, sorting, and search.

## Changes

### 1. New Page: `src/pages/admin/AllEstimates.tsx`
- Query `gutter_estimates` with `select("*, profiles:created_by(full_name)")` to get rep names
- Also join `quote_requests` via `lead_id` to show linked lead info (customer name, reference number, status)
- Display a searchable, sortable table with columns: Date, Rep, Customer, Job #, Quoted Price, Floor Price, Commission, Lead Status (linked/standalone), Actions (view/edit)
- **Filters**: Rep dropdown (from profiles), date range, linked vs standalone, min/max price
- **Sort**: Click column headers to sort by date, price, commission, rep name
- **Search**: Text filter across customer name, job number, rep name
- Mobile: card layout (same pattern as MyEstimates)
- "View" button navigates to the estimate in the estimator tool (pass as state)

### 2. Route: `src/App.tsx`
- Add `<Route path="estimates" element={<AllEstimates />} />` under the admin routes
- Lazy import the new page

### 3. Nav: `src/pages/admin/AdminLayout.tsx`
- Add `{ icon: FileText, label: 'All Estimates', path: '/admin/estimates' }` to the "Pipeline & Revenue" nav group

### 4. No DB Changes
- RLS already allows admins full access to `gutter_estimates`
- No new tables or columns needed

