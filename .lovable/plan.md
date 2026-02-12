

## Redesign Internet Metrics to Match Canvass Layout and Move Ad Spend Budget

### What's Changing

**1. Add "Monthly Ad Spend Budget" to the Fiscal Year Goals settings card** (lines 443-475 area in CompanyGoals.tsx)
- Add a new input field for `target_ad_spend_budget` in the goal settings form, alongside the existing Target Lead-to-Close % and Target Cost per Contract fields
- This requires adding a `target_ad_spend_budget` column to the `company_goals` table via migration
- The budget value will be used as the goal comparison in the internet metric cards below

**2. Replace the 5 simple StatsCard-based internet metric cards with 3 rich Card components** that match the canvass metrics style (Lead-to-Close Rate, Cost Per Contract, Cost Per Lead)

The new cards will be:

- **Internet Lead-to-Close Rate** -- Matches the canvass "Lead-to-Close Rate" card style. Shows current close %, "X closed / Y leads" subtitle, goal comparison with on-target/below-target indicator (using the same target LtC goal)
- **Internet Cost Per Contract** -- Matches the canvass "Cost Per Contract" card style. Shows ad spend / contracts won, goal comparison against ad spend budget, over/under budget indicator
- **Internet Cost Per Lead** -- Matches the canvass "Cost Per Lead" card style. Shows ad spend / internet leads, with a "vs Cost Per Contract" comparison box

**3. Move Ad Spend and Internet Leads counts into the metric card subtitles** rather than as standalone cards. The Ad Spend actual amount will show as a subtitle ("$X spent / Y contracts"), and Internet Leads count shows in the LtC subtitle ("X closed / Y leads").

**4. Keep the AdSpendCard with edit button** as a standalone card at the top of the Internet section, so admins can still quickly update actual spend. But restyle it to match the rich card format.

### Layout Comparison

Current canvass section (3 cards in a row):
- Lead-to-Close Rate | Cost Per Contract | Cost Per Lead

New internet section (matching 3 cards in a row + 1 ad spend entry):
- Ad Spend (with edit) | Internet Lead-to-Close Rate | Internet Cost Per Contract | Internet Cost Per Lead

Actually, to keep it truly uniform with the canvass section (3 cards), the layout will be:

- **Row: 3 internet metric cards** matching the canvass row exactly:
  - Internet Lead-to-Close Rate (with goal comparison)
  - Internet Cost Per Contract (with ad spend budget goal comparison)
  - Internet Cost Per Lead (with breakdown)

- The Ad Spend actual entry will be handled via the AdSpendCard kept as a single card above the row, or integrated into the Cost Per Contract subtitle.

### Technical Details

**Database migration:**
- Add `target_ad_spend_budget NUMERIC(10,2) DEFAULT 0` to `company_goals` table

**Files changed:**

| File | Change |
|---|---|
| New migration SQL | Add `target_ad_spend_budget` column to `company_goals` |
| `src/pages/admin/CompanyGoals.tsx` | (1) Add ad spend budget input to Fiscal Year Goals card; (2) Replace the 5 simple StatsCard grid with 3 rich Card components matching the canvass cards; (3) Keep AdSpendCard with edit button above the row; (4) Add state/save for `target_ad_spend_budget` |

**Detailed CompanyGoals.tsx changes:**

- Add `targetAdSpendBudget` state variable and wire it into `handleSave` and the goal fetch
- Add a new input field in the goals form (line 460-474 area): "Monthly Ad Spend Budget ($)" with helper text "Target monthly advertising budget"
- Replace lines 773-788 (the simple grid with 5 StatsCards) with:
  - AdSpendCard with edit button (single card, full width or half width)
  - 3 rich Card components in a `grid-cols-1 md:grid-cols-3` layout:
    1. Internet Lead-to-Close Rate -- fetches from `user_metrics` aggregating `internet_leads` and `internet_leads_closed`, shows goal comparison against `targetLeadToCloseRatio`
    2. Internet Cost Per Contract -- fetches ad spend from `ad_spend_tracking` and contract count from `quote_requests`, shows goal comparison against `targetAdSpendBudget`
    3. Internet Cost Per Lead -- fetches ad spend and internet lead count, shows breakdown with vs Cost Per Contract comparison

- The data fetching for internet metrics will be done inline in CompanyGoals (using `useQuery` or adding to the existing `fetchData`), pulling from `ad_spend_tracking` and `quote_requests` tables

**The 5 standalone overview card components** (`InternetLeadsCard`, `InternetLeadCloseRateCard`, `InternetCostPerLeadCard`, `InternetCostPerContractCard`, `AdSpendCard`) will remain in the codebase but the first 4 will no longer be imported in CompanyGoals. `AdSpendCard` stays as the quick-edit entry point.
