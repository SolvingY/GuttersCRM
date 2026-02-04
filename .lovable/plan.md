
## Plan: Fix Leaderboard Contracts & Add Summary Totals

### Summary of Issues Identified

Based on my analysis of the database schema and code:

**1. Weekly/Monthly Sales Rep Contracts Issue**
- The `weekly_user_metrics` table has three contract-related columns:
  - `closed_deals` (Self-Gen Deals)
  - `canvass_deals_closed` (Canvass Deals)
- Current queries only fetch `closed_deals`, missing `canvass_deals_closed`
- **Fix**: Fetch both and calculate `Total Contracts = closed_deals + canvass_deals_closed`

**2. YTD Sales Rep Contracts Issue**
- The YTD calculation in `Leaderboard.tsx` correctly adds `selfGeneratedDeals + canvassDealsClose`
- However, the `LeaderboardTable.tsx` component does NOT display a "Total Contracts" column
- **Fix**: Add "Total Contracts" column to the YTD table

**3. Missing Summary Totals Rows**
- No totals footer exists on any leaderboard table
- **Fix**: Add `<tfoot>` section with aggregate calculations

---

### Part 1: Fix Weekly/Monthly Contract Queries

**Files to modify:**
- `src/pages/dashboard/Leaderboard.tsx` (lines 325-327, 403-406)
- `src/pages/admin/AdminLeaderboards.tsx` (lines 244-246, 299-301)

**Changes:**

Update the select query to include `canvass_deals_closed`:
```typescript
// Before
.select('user_id, approved_revenue, collections, leads, closed_deals, points_earned')

// After  
.select('user_id, approved_revenue, collections, leads, closed_deals, canvass_deals_closed, points_earned')
```

Update the mapping to calculate total contracts:
```typescript
// Before
closedDeals: Number(w.closed_deals) || 0,

// After
closedDeals: (Number(w.closed_deals) || 0) + (Number(w.canvass_deals_closed) || 0),
```

Same changes apply to both weekly and monthly aggregation logic.

---

### Part 2: Add Total Contracts Column to YTD Table

**File:** `src/components/dashboard/LeaderboardTable.tsx`

Add new column header after "Collections":
```tsx
<th className="text-right py-3 px-4 text-sm font-bold whitespace-nowrap">Total Contracts</th>
```

Add data cell:
```tsx
<td className="py-3 px-4 text-right">
  <span className="font-medium">{entry.closedDeals}</span>
</td>
```

The `closedDeals` field is already calculated correctly in `Leaderboard.tsx` (line 275) as:
```typescript
const calculatedClosedDeals = data.selfGeneratedDeals + extendedMetrics.canvassDealsClose;
```

---

### Part 3: Add Summary Totals Footer to All Tables

**Sales Rep Tables (Weekly, Monthly, YTD)**

Add a `<tfoot>` section showing:
| Metric | Formula |
|--------|---------|
| Total Approved Revenue | Sum of all approvedRevenue |
| Total Collections | Sum of all collections |
| Total Contracts | Sum of all closedDeals |
| Combined Close % | (Total Contracts / Total Leads) × 100 |

**Files:**
- `src/components/dashboard/LeaderboardTable.tsx` (YTD)
- `src/components/dashboard/WeeklyLeaderboardTable.tsx` (Weekly/Monthly)

**Implementation for Sales Rep tables:**
```tsx
// Calculate totals
const totals = useMemo(() => {
  const totalRevenue = entries.reduce((sum, e) => sum + e.approvedRevenue, 0);
  const totalCollections = entries.reduce((sum, e) => sum + (e.collections || 0), 0);
  const totalContracts = entries.reduce((sum, e) => sum + e.closedDeals, 0);
  const totalLeads = entries.reduce((sum, e) => sum + (e.leads || 0), 0);
  const closePercent = totalLeads > 0 ? (totalContracts / totalLeads) * 100 : 0;
  
  return { totalRevenue, totalCollections, totalContracts, totalLeads, closePercent };
}, [entries]);

// Footer row
<tfoot className="bg-slate-700 text-white font-bold">
  <tr>
    <td colSpan={2} className="py-3 px-4">TEAM TOTALS</td>
    <td className="py-3 px-4 text-right">{formatCurrency(totals.totalRevenue)}</td>
    <td className="py-3 px-4 text-right">{formatCurrency(totals.totalCollections)}</td>
    <td className="py-3 px-4 text-right">{totals.totalContracts}</td>
    <td className="py-3 px-4 text-right">
      {totals.totalLeads > 0 ? `${totals.closePercent.toFixed(1)}%` : '—'}
    </td>
    ...
  </tr>
</tfoot>
```

---

**Canvasser Tables (Weekly, Monthly, YTD)**

Add a `<tfoot>` section showing:
| Metric | Formula |
|--------|---------|
| Total Contracts (Closed) | Sum of all leadsClosed |
| Total Leads Set | Sum of all leadsSet |
| Lead-to-Close % | (Total Closed / Total Leads Set) × 100 |
| Lead-to-Contract Ratio | Total Leads Set / Total Closed (e.g., "3.5:1") |

**Files:**
- `src/components/dashboard/CanvasserLeaderboardTable.tsx` (YTD)
- `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx` (Weekly/Monthly)

**Implementation for Canvasser tables:**
```tsx
const totals = useMemo(() => {
  const totalClosed = entries.reduce((sum, e) => sum + e.leadsClosed, 0);
  const totalLeadsSet = entries.reduce((sum, e) => sum + e.leadsSet, 0);
  const closePercent = totalLeadsSet > 0 ? (totalClosed / totalLeadsSet) * 100 : 0;
  const leadsPerContract = totalClosed > 0 ? totalLeadsSet / totalClosed : 0;
  
  return { totalClosed, totalLeadsSet, closePercent, leadsPerContract };
}, [entries]);

// Footer row
<tfoot className="bg-slate-700 text-white font-bold">
  <tr>
    <td colSpan={2} className="py-3 px-4">TEAM TOTALS</td>
    <td className="py-3 px-4 text-right">{totals.totalLeadsSet}</td>
    <td className="py-3 px-4 text-right">{totals.totalClosed}</td>
    <td className="py-3 px-4 text-right">
      {totals.totalLeadsSet > 0 ? `${totals.closePercent.toFixed(1)}%` : '—'}
    </td>
    <td className="py-3 px-4 text-right">
      {totals.totalClosed > 0 ? `${totals.leadsPerContract.toFixed(1)}:1` : '—'}
    </td>
  </tr>
</tfoot>
```

---

### Files to be Modified

| File | Changes |
|------|---------|
| `src/pages/dashboard/Leaderboard.tsx` | Add `canvass_deals_closed` to weekly/monthly queries, calculate total |
| `src/pages/admin/AdminLeaderboards.tsx` | Add `canvass_deals_closed` to weekly/monthly queries, calculate total |
| `src/components/dashboard/LeaderboardTable.tsx` | Add "Total Contracts" column + summary footer |
| `src/components/dashboard/WeeklyLeaderboardTable.tsx` | Update interface for leads, add summary footer |
| `src/components/dashboard/CanvasserLeaderboardTable.tsx` | Add summary footer with canvasser-specific ratios |
| `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx` | Add summary footer with canvasser-specific ratios |

---

### Summary of Changes

**Data Fixes:**
- Weekly/Monthly contracts now include both `closed_deals` + `canvass_deals_closed`
- YTD already calculates correctly, just needs column displayed

**New Columns:**
- YTD Sales Rep table: "Total Contracts" column added

**New Footer Rows:**

| Table | Totals Displayed |
|-------|------------------|
| Sales Rep YTD | Revenue, Collections, Contracts, Close % |
| Sales Rep Weekly/Monthly | Revenue, Collections, Contracts, Close % |
| Canvasser YTD | Leads Set, Contracts Closed, Close %, Lead:Contract Ratio |
| Canvasser Weekly/Monthly | Leads Set, Contracts Closed, Close %, Lead:Contract Ratio |

---

### Expected Results

1. **Weekly/Monthly contracts correct**: Shows sum of Self-Gen + Canvass deals
2. **YTD shows Total Contracts**: New column in the YTD table
3. **All leaderboards have team totals footer** with:
   - Sales Reps: Total Revenue, Collections, Contracts, Close %
   - Canvassers: Total Leads, Contracts, Close %, Lead-to-Contract Ratio
