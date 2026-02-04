
## Fix Plan: Canvasser View Toggle & Admin YTD Total Contracts

### Problem 1: Canvasser Dashboard Not Displaying

**Current Behavior**: When you toggle from "Sales" to "Canvasser" in the header, the URL changes but you still see the Sales Rep Dashboard layout instead of the Canvasser Portal.

**Root Cause**: The `RoleViewToggle` component currently only navigates when the path doesn't already start with `/canvasser`. However, when you're in the Sales Rep dashboard and toggle to Canvasser, the navigation should work. Looking at the screenshot, the toggle shows "Canvasser" is selected but the dashboard title still says "Sales Rep Dashboard".

**Fix**: The `RoleViewToggle` component's navigation logic needs adjustment. When clicking Canvasser while on `/dashboard/*`, it should navigate to `/canvasser`. The issue may be that the toggle is appearing correctly but the `CanvasserLayout` component uses the same `DashboardHeader`, which shows the correct title based on path. Need to verify the navigation is actually being triggered.

**Files to Modify**:
- `src/components/dashboard/RoleViewToggle.tsx` - Ensure navigation happens immediately on toggle

---

### Problem 2: Admin YTD Total Contracts Shows 0

**Current Behavior**: The Admin Leaderboards YTD view shows "Total Contracts: 0" for all sales reps, while the Sales Rep dashboard correctly shows the contracts.

**Root Cause**: The Admin YTD query in `AdminLeaderboards.tsx` only fetches `closed_deals` from `user_metrics`, but:
- `closed_deals` is NOT the same as Total Contracts
- Total Contracts should be calculated as: `self_generated_deals + canvass_deals_closed`

The Sales Rep dashboard (`Leaderboard.tsx`) correctly fetches both fields and calculates the sum on line 275. The Admin query does not.

**Fix**: Update `AdminLeaderboards.tsx` YTD fetch to:
1. Fetch `self_generated_deals` and `canvass_deals_closed` from `user_metrics`
2. Calculate Total Contracts as the sum of both

**Current Admin Query (line 145)**:
```typescript
.select('id, user_id, display_name, points, closed_deals, yearly_goal, sales_rank, metric_date, approved_revenue, collections, updated_at')
```

**Fixed Query**:
```typescript
.select('id, user_id, display_name, points, closed_deals, self_generated_deals, canvass_deals_closed, yearly_goal, sales_rank, metric_date, approved_revenue, collections, updated_at')
```

**Current Mapping (line 178)**:
```typescript
closedDeals: Number(item.closed_deals) || 0,
```

**Fixed Mapping**:
```typescript
closedDeals: (Number(item.self_generated_deals) || 0) + (Number(item.canvass_deals_closed) || 0),
```

**Files to Modify**:
- `src/pages/admin/AdminLeaderboards.tsx` - Update YTD query and mapping

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/components/dashboard/RoleViewToggle.tsx` | Fix navigation to ensure immediate portal switch |
| `src/pages/admin/AdminLeaderboards.tsx` | Fix YTD Total Contracts calculation to use `self_generated_deals + canvass_deals_closed` |

---

### Technical Details

**RoleViewToggle Navigation Fix**:
The current logic checks if path starts with `/canvasser` before navigating. But when toggling from Sales to Canvasser while on `/dashboard/stats`, it should navigate to `/canvasser/stats` or just `/canvasser`. The navigation appears correct but may have a race condition with state updates.

**Admin YTD Data Flow**:
```
user_metrics table
├── self_generated_deals (Self-Gen Contracts)
├── canvass_deals_closed (Canvass Contracts)
└── closed_deals (Legacy field - don't use for Total)

Total Contracts = self_generated_deals + canvass_deals_closed
```

---

### Expected Results

1. When Super Admin toggles to "Canvasser", they immediately see the Canvasser Portal with canvasser-specific navigation and stats
2. Admin YTD leaderboard shows correct Total Contracts (matching what Sales Rep dashboard shows)
3. The screenshot showing "2" contracts for one user will show correctly in Admin view
