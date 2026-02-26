
# Phase 3 Reorganization: Dashboard Widget Relocation and Hours Tracker Fix

## Overview

Four changes: move widgets between admin sections, create a new "Leadflow Statistics" page, and fix the canvasser hours tracker week display.

---

## 1. Move Overdue Follow-ups to Leads page

**File: `src/pages/admin/Leads.tsx`**
- Import and render `OverdueFollowupsWidget` at the top of the leads page (before the leads table)
- Pass `isAdmin={true}`

**File: `src/pages/dashboard/AdminOverview.tsx`**
- Remove the `<OverdueFollowupsWidget isAdmin={true} />` line (line 891)
- Remove the import if no longer used here

---

## 2. Create "Leadflow Statistics" page under Leads & Sales

**New file: `src/pages/admin/LeadflowStatistics.tsx`**
- A new page containing:
  - Pipeline Funnel (collapsible, default expanded) -- moved from AdminOverview
  - Average Time to Close (collapsible, default expanded) -- moved from AdminOverview
- Imports `PipelineFunnelWidget` and `TimeToCloseWidget`
- Simple page with heading "Leadflow Statistics" and both collapsible sections

**File: `src/pages/dashboard/AdminOverview.tsx`**
- Remove the Pipeline Funnel collapsible section (lines 896-910)
- Remove the Time-to-Close collapsible section (lines 912-926)
- Remove related state variables (`pipelineFunnelOpen`, `timeToCloseOpen`) and imports (`PipelineFunnelWidget`, `TimeToCloseWidget`) if no longer used

**File: `src/App.tsx`**
- Import `LeadflowStatistics` and add route: `<Route path="leadflow" element={<LeadflowStatistics />} />`

**File: `src/pages/admin/AdminLayout.tsx`**
- Add nav item under "Leads & Sales" group:
  ```
  { icon: TrendingUp, label: 'Leadflow Statistics', path: '/admin/leadflow' }
  ```
- Import `TrendingUp` from lucide-react

---

## 3. Move "Recent Point Activity" to Contests page

**File: `src/pages/dashboard/AdminOverview.tsx`**
- Remove `<RecentPointTransactionsWidget />` (line 1447)
- Remove the import if no longer used

**File: `src/pages/dashboard/Contests.tsx`**
- Import and render `RecentPointTransactionsWidget` at the bottom of the contests page

---

## 4. Change Canvasser Hours Tracker to Thursday-Wednesday

**File: `src/pages/dashboard/AdminOverview.tsx`**

The week currently starts on Monday. Changes needed:

- **`selectedHoursWeek` initialization** (lines 143-148): Change to find the most recent Thursday instead of Monday
  ```
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 4=Thu
  const diff = d.getDate() - ((day + 3) % 7); // days back to last Thursday
  return new Date(d.getFullYear(), d.getMonth(), diff);
  ```

- **Day headers** (line 1252): Change from `['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']` to `['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed']`

- **Move-day labels** (line 1308): Change from `['M', 'T', 'W', 'T', 'F', 'S', 'S']` to `['T', 'F', 'S', 'S', 'M', 'T', 'W']` and update matching move-day titles (line 1318)

- **`getWeekStartForDate` helper** (lines 159-165): Update to calculate Thursday-based week start instead of Monday

- The 7-day iteration (`weekDays` array at line 1260) stays the same since it always generates 7 consecutive days from `selectedHoursWeek` -- it just now starts on Thursday instead of Monday

- **Weekly metrics sync** (`getWeekEndForDate` at lines 167-171): The +6 day calculation stays the same but now represents Thu-Wed range

---

## Summary of Files

| Action | File |
|--------|------|
| Create | `src/pages/admin/LeadflowStatistics.tsx` |
| Modify | `src/pages/dashboard/AdminOverview.tsx` -- remove 3 widgets, fix hours tracker week |
| Modify | `src/pages/admin/AdminLayout.tsx` -- add Leadflow Statistics nav item |
| Modify | `src/App.tsx` -- add leadflow route |
| Modify | `src/pages/admin/Leads.tsx` -- add OverdueFollowupsWidget |
| Modify | `src/pages/dashboard/Contests.tsx` -- add RecentPointTransactionsWidget |
