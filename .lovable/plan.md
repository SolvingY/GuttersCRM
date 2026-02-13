

## Company Goals Page Enhancements

### Overview
Three main changes: (1) Apply the Target Cost Per Contract goal to both Canvass and Internet cost-per-contract cards, (2) Make Ad Spend a cumulative YTD tracker with per-month entries, and (3) Add Internet Contracts Progress + Total Contracts Progress cards alongside the existing Canvasser Contracts Progress card. Also update the goal form with new fields.

---

### 1. Database Migration

Add new columns to `company_goals`:

- `internet_contracts_goal` (integer, default 0) -- target for internet contracts
- `total_contracts_goal` (integer, default 0) -- combined target for Self-Gen + Canvass + Internet contracts

The existing `target_cost_per_lead` column is already being used as "Target Cost per Contract" and will be reused for both Canvass and Internet cost-per-contract comparisons. No rename needed.

The existing `canvasser_leads_goal` will continue as the Canvasser Contracts goal.

---

### 2. Ad Spend: Cumulative YTD Tracker

**Current state:** The page only shows a single "Ad Spend (This Month)" value from `ad_spend_tracking`.

**New behavior:**
- Fetch ALL rows from `ad_spend_tracking` for the current calendar year (Jan-Dec 2026)
- Display a cumulative YTD total at the top (sum of all months)
- Show a monthly breakdown table/list below it, with each month's spend and a pencil icon to edit that month
- Months with no entry show $0
- The existing `AdSpendDialog` will be extended to accept a month parameter so admins can set spend for any month (not just the current one)

**UI Layout:**
- Card header: "Ad Spend (YTD)" with cumulative total as the big number
- Below: a compact list of months (Jan through current month), each showing amount and an edit button
- Budget comparison uses `target_ad_spend_budget * months_elapsed` vs cumulative spend

---

### 3. Progress Cards Update

Replace the current 3-card grid (Sales Revenue, Canvasser Contracts, Collections) with a layout that includes:

**Row 1 (existing, kept as-is):**
- Sales Revenue Progress
- Total Collections YTD

**Row 2 (contract progress cards):**
- **Canvasser Contracts Progress** (existing, uses `canvasser_leads_goal`)
- **Internet Contracts Progress** (NEW, uses `internet_contracts_goal`)
  - Current: sum of `internet_leads_closed` from `user_metrics`
  - Goal: `internet_contracts_goal` from `company_goals`
- **Total Contracts Progress** (NEW, uses `total_contracts_goal`)
  - Current: Self-Gen deals + Canvass deals closed + Internet leads closed (all from `user_metrics`)
  - Goal: `total_contracts_goal` from `company_goals`

---

### 4. Cost Per Contract Goal Applied to Both Sections

The existing `target_cost_per_lead` value (labeled "Target Cost per Contract" in the form) will be used as the goal comparison in:
- **Canvass Cost Per Contract card** (already working)
- **Internet Cost Per Contract card** (currently compares against ad spend budget; will change to compare against `target_cost_per_lead`)

---

### 5. Goal Form Updates

Add two new input fields to the Fiscal Year Goals form:

| Field | Label | Helper Text |
|---|---|---|
| `internet_contracts_goal` | Internet Contracts Goal | Target internet contracts closed for the year |
| `total_contracts_goal` | Total Contracts Goal (All Sources) | Combined target: Self-Gen + Canvass + Internet |

Update the existing "Company Contracts Goal" label/helper to clarify it's specifically for Canvasser contracts.

---

### Technical Details

**File: Database migration (new)**
- `ALTER TABLE company_goals ADD COLUMN internet_contracts_goal integer DEFAULT 0;`
- `ALTER TABLE company_goals ADD COLUMN total_contracts_goal integer DEFAULT 0;`

**File: `src/pages/admin/CompanyGoals.tsx`**

1. **State and interface updates:**
   - Add `internetContractsGoal` and `totalContractsGoal` form state
   - Update `CompanyProgress` interface to include `totalSelfGenDeals`, `totalInternetClosed`
   - Fetch `self_generated_deals` and `internet_leads_closed` in the sales metrics query (already partially done)

2. **Ad Spend YTD query:**
   - New query fetching all `ad_spend_tracking` rows where month >= '2026-01-01' and month <= '2026-12-01'
   - Compute cumulative total
   - Render monthly breakdown with per-month edit capability

3. **AdSpendDialog update** (`src/components/admin/AdSpendDialog.tsx`):
   - Accept optional `month` prop to allow editing any specific month
   - Default to current month if not provided

4. **Progress cards:**
   - Keep Sales Revenue and Collections cards
   - Keep Canvasser Contracts Progress
   - Add Internet Contracts Progress card (same layout pattern)
   - Add Total Contracts Progress card summing all three sources

5. **Internet Cost Per Contract card:**
   - Change comparison from ad spend budget to `target_cost_per_lead` (the shared cost-per-contract goal)

6. **handleSave:**
   - Include `internet_contracts_goal` and `total_contracts_goal` in the save payload

