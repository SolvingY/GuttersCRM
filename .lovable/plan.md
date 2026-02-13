

## Fix Lead-to-Close % Calculation and Contract Source Breakdown

### Problem
The "Lead Close %" shows **2000.0%** because the formula uses `totalClosedDeals` (which includes Self-Gen) divided by `totalLeads` (Canvass + Internet only). Self-Gen contracts inflate the numerator with no matching denominator. The Contract Sources card also omits Internet contracts.

### Changes (1 file: `src/pages/dashboard/AdminOverview.tsx`)

**1. Expand the AggregateMetrics interface and reduce function (lines 21-27, 307-316)**
- Add `totalSelfGen`, `totalCanvassClosedDeals`, `totalInternetClosedDeals`, and `totalClosedForLtC` to the interface and the `reduce` call
- `totalClosedForLtC` = canvass closed + internet closed (excludes Self-Gen)

**2. Fix Lead Close % StatsCard (line 621)**
- Change formula from `totalClosedDeals / totalLeads` to `totalClosedForLtC / totalLeads`
- Expected result with current data: (0 + 1) / (0 + 1) = **100.0%** instead of 2000%

**3. Update "Total Leads" label (line 617)**
- Rename to "Total Leads (Close %)" or add subtitle clarifying it only includes Canvass + Internet

**4. Add Internet Contracts to Contract Sources card (lines 626-664)**
- Add a third row for Internet Contracts with progress bar
- Update total to include all three: Self-Gen + Canvass + Internet
- Add helper text under each row: "Does not count toward Close %" for Self-Gen, "Counts toward Close %" for Canvass and Internet
- Use a distinct color for the Internet progress bar (e.g., `bg-blue-500`)

### Metrics Reference

| Metric | Formula | Counts Toward Close % |
|---|---|---|
| Self-Gen Contracts | `self_generated_deals` | No |
| Canvass Contracts | `canvass_deals_closed` | Yes |
| Internet Contracts | `internet_leads_closed` | Yes |
| Lead Close % | (canvass closed + internet closed) / (canvass leads + internet leads) | -- |

### Expected Result
- Before: Lead Close % = 20 / 1 = 2000.0%
- After: Lead Close % = (0 + 1) / (0 + 1) = 100.0%
- Contract Sources: Self-Gen 18 (90%), Canvass 0 (0%), Internet 1 (5%), Total 19

