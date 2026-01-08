# Plan: Rename Metrics and Consolidate Total Contracts/Leads Calculations

## Overview
Rename "Canvass Closed" to "Canvass Contracts", rename "Closed Deals" to "Total Contracts" (calculated as Canvass Contracts + Self-Gen Contracts), and ensure Total Leads = Canvass Leads + Self-Gen Leads for company-wide metrics.

---

## Current State Analysis

### Database Schema (user_metrics table)
The database contains these relevant columns:
- `closed_deals` - Currently stores the raw closed deals count
- `canvass_deals_closed` - Canvass contracts
- `self_generated_deals` - Self-generated contracts
- `leads` - Currently stores the raw leads count
- `canvass_leads` - Canvass leads
- `self_generated_leads` - Self-generated leads

### Current Issues Found
1. **Terminology Issue**: "Canvass Closed" and "Closed Deals" labels are inconsistent
2. **Calculation Issue**: `closed_deals` is stored separately rather than being calculated as `canvass_deals_closed + self_generated_deals`
3. **Leads Issue**: `leads` is stored separately rather than being calculated as `canvass_leads + self_generated_leads`

---

## Phase 1: Rename Labels Across UI Components

### Files to Update with "Canvass Closed" -> "Canvass Contracts"

| File | Location | Change |
|------|----------|--------|
| `src/components/dashboard/EditMetricsModal.tsx` | Line 282 | Change label "Canvass Closed" to "Canvass Contracts" |
| `src/pages/admin/WeeklyUpdates.tsx` | Line 561 | Change header "Canvass Closed" to "Canvass Contracts" |
| `src/pages/admin/WeeklyUpdates.tsx` | Line 641 | Change mobile label "Canvass Closed" to "Canvass Contracts" |

### Files to Update with "Closed Deals" -> "Total Contracts"

| File | Location | Change |
|------|----------|--------|
| `src/components/dashboard/EditMetricsModal.tsx` | Line 224 | Change label "Closed Deals" to "Total Contracts" |
| `src/components/dashboard/LeaderboardTable.tsx` | Interface and usage | Keep internal field name `closedDeals`, display uses calculated value |
| `src/components/dashboard/WeeklyLeaderboardTable.tsx` | Line 62 | Change header "Closed Deals" to "Total Contracts" |
| `src/lib/reportGenerator.ts` | Lines 14, 56, 174, 196, 207, 425, 458, 480, 640, 670 | Change all "Closed Deals" labels to "Total Contracts" |
| `src/components/dashboard/PointsBreakdownTooltip.tsx` | Line 73 | Change "closed" to "contracts" in display |

---

## Phase 2: Update Calculations for Total Contracts

### Logic Change
**Total Contracts = Canvass Contracts + Self-Gen Contracts**

### Files to Update

#### AdminOverview.tsx
1. Add `selfGeneratedDeals` and `canvassDealsClose` to the data fetch
2. Calculate `closedDeals = selfGeneratedDeals + canvassDealsClose` when aggregating
3. Update the aggregation in `fetchAdminData()`:
   ```typescript
   const totalClosedDeals = selfGeneratedDeals + canvassDealsClose;
   ```

#### Leaderboard.tsx
1. Fetch `self_generated_deals` and `canvass_deals_closed` columns
2. Calculate `closedDeals = selfGeneratedDeals + canvassDealsClose`
3. Update the entries mapping

#### CompanyGoals.tsx
1. Update the fetch to include `self_generated_deals`, `canvass_deals_closed`
2. Calculate `totalSalesClosedDeals = selfGeneratedDeals + canvassDealsClose`

#### WeeklyUpdates.tsx
1. Already has separate fields for self-gen and canvass contracts
2. Update calculations to derive `closed_deals` from the sum

---

## Phase 3: Update Calculations for Total Leads

### Logic Change
**Total Leads = Canvass Leads + Self-Gen Leads**

### Files to Update

#### AdminOverview.tsx
1. Add `canvassLeads` to the data fetch (already has `selfGeneratedLeads`)
2. Calculate `leads = selfGeneratedLeads + canvassLeads` when aggregating
3. Update the aggregation:
   ```typescript
   const totalLeads = selfGeneratedLeads + canvassLeads;
   ```

#### Leaderboard.tsx
1. Fetch `self_generated_leads` and `canvass_leads` columns
2. Calculate total leads from the sum

#### CompanyGoals.tsx
1. Update the fetch to include `self_generated_leads`, `canvass_leads`
2. Calculate `totalSalesLeads = selfGeneratedLeads + canvassLeads`

---

## Phase 4: Update reportGenerator.ts

1. Rename interface field comments and Excel/PDF labels:
   - "Closed Deals" -> "Total Contracts"
   - "Canvass Deals" -> "Canvass Contracts"
   - "Self-Gen Deals" -> "Self-Gen Contracts"

2. Update the `CompanySummary` interface documentation

3. Update Excel headers (line 196):
   ```typescript
   'Closed Deals' -> 'Total Contracts'
   'Canvass Deals' -> 'Canvass Contracts'
   ```

4. Update PDF labels throughout

---

## Phase 5: Update PointsBreakdownTooltip.tsx

Change the display text from:
```
{data.closedDeals} closed x 10
```
to:
```
{data.closedDeals} contracts x 10
```

---

## Summary of All Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/EditMetricsModal.tsx` | Rename labels |
| `src/pages/admin/WeeklyUpdates.tsx` | Rename headers and labels |
| `src/components/dashboard/WeeklyLeaderboardTable.tsx` | Rename header |
| `src/components/dashboard/LeaderboardTable.tsx` | Ensure correct calculation |
| `src/pages/dashboard/Leaderboard.tsx` | Update fetch and calculations |
| `src/pages/dashboard/AdminOverview.tsx` | Update fetch and calculations |
| `src/pages/admin/CompanyGoals.tsx` | Update fetch and calculations |
| `src/lib/reportGenerator.ts` | Rename all labels in exports |
| `src/components/dashboard/PointsBreakdownTooltip.tsx` | Update display text |

---

## Critical Files for Implementation

1. **src/pages/dashboard/AdminOverview.tsx** - Core aggregation logic for company totals
2. **src/pages/dashboard/Leaderboard.tsx** - Leaderboard data fetching and calculations
3. **src/lib/reportGenerator.ts** - Excel/PDF export labels
4. **src/components/dashboard/EditMetricsModal.tsx** - Admin edit form labels
5. **src/pages/admin/WeeklyUpdates.tsx** - Weekly entry form labels
