

# Fix Close % Logic on Admin Overview

## Problem

The Close % on the Admin Overview page is calculated from **manually entered metrics** in the `user_metrics` table (`internet_leads`, `internet_leads_closed`, `canvass_leads`, `canvass_deals_closed`). These values only update when an admin enters daily deltas — they do not reflect the actual state of leads in the system. So when Drew loses an internet lead or Dustin has an open one, the Close % doesn't change because those events live in `quote_requests`, not in the manually entered metrics.

## Solution

Replace the Close % calculation with a **live query against `quote_requests`** for each sales rep. This ensures the number reflects reality:

- **Leads** = count of `quote_requests` assigned to the rep (excluding archived/cancelled)
- **Closed** = count of those where `status` is `won`, `scheduled`, or `completed`
- **Close %** = Closed / Leads × 100

This applies to:
1. **Per-rep Close %** in the Sales Rep Performance table
2. **Company-wide Lead Close %** stat card at the top

## Implementation

### File: `src/pages/dashboard/AdminOverview.tsx`

In `fetchAdminData()`, after fetching `user_metrics` and building the user details list, add a query to `quote_requests` to get real lead counts per rep:

```sql
-- For each assigned_to, count total leads and won/scheduled/completed leads
SELECT assigned_to, status FROM quote_requests
WHERE assigned_to IS NOT NULL
  AND archived_at IS NULL
  AND cancelled_at IS NULL
```

Then group by `assigned_to` in JS to compute:
- `realLeads` = total assigned (non-archived, non-cancelled)
- `realClosed` = those with status in (`won`, `scheduled`, `completed`)
- `realClosePercent` = realClosed / realLeads × 100

Update each `UserDetail` entry's `leadToClosePercent`, `leads` (for Close % display), and the aggregate `totalClosedForLtC` / `totalLeads` to use these real numbers instead of manually entered ones.

The existing manually entered `canvass_leads`, `internet_leads`, etc. fields remain for other reporting purposes — only the Close % display switches to live data.

### Scope of Change

| Item | Change |
|------|--------|
| `AdminOverview.tsx` `fetchAdminData()` | Add `quote_requests` query, compute per-rep close % from real data |
| Close % column in table | No change needed (already reads `leadToClosePercent`) |
| Company Close % stat card | Update to use real totals |
| Other pages | No changes — they have their own calculation logic |

