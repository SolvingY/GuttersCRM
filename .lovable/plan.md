

# Fix Stats, Progress Bars, and Lead-to-Close Breakdown

## Issues Identified

### 1. Incorrect Stats in Email Report
The weekly report's Company Performance Summary shows wrong numbers because:
- **Contracts** uses the `closed_deals` column from the database, which only tracks internet and canvass closes (via triggers). It misses self-generated deals. The correct formula is: `self_generated_deals + canvass_deals_closed + internet_leads_closed`.
  - Email shows: 10 contracts (YTD) vs. dashboard showing 20
- **Leads** uses a legacy `leads` column that is mostly zero. Should use `canvass_leads + internet_leads`.
  - Email shows: 1 lead (YTD) vs. dashboard showing 3
- **LtC %** appears correct in formula but produces wrong results because leads count is wrong

### 2. Progress Bars Not Showing Color
The Contract Sources section on the Admin Overview uses `bg-primary` for the Canvass Contracts progress bar. In light mode, `--primary` is pure black (`0 0% 0%`), which technically renders but blends poorly with the design. Will replace with distinct, vibrant colors for each source type to ensure visibility across themes.

### 3. Lead-to-Close Ratio Needs Source Breakdown
Currently the Company Performance Summary in the email only shows a single combined LtC %. The user wants separate close rates for:
- **Self-Generated** (does not count toward LtC -- note this)
- **Canvass** (canvass_deals_closed / canvass_leads)
- **Internet** (internet_leads_closed / internet_leads)

## Changes

### File 1: `supabase/functions/send-scheduled-report/index.ts`

**Data model updates:**
- Expand `CompanyPeriodStats` interface to include separate fields: `selfGenContracts`, `canvassContracts`, `canvassLeads`, `internetContracts`, `internetLeads`, `canvassLtc`, `internetLtc`
- Update YTD query to also fetch `self_generated_deals`
- Fix `contracts` calculation: `self_generated_deals + canvass_deals_closed + internet_leads_closed`
- Fix `leads` calculation: `canvass_leads + internet_leads` (not the legacy `leads` column)

**LtC breakdown in email:**
- Replace the single LtC % column with three columns: Self-Gen Contracts, Canvass LtC %, Internet LtC %
- Or add a new "Lead Source Breakdown" section below the summary table showing each source's close rate

**Weekly/monthly stats fix:**
- The `weekly_user_metrics` table lacks `internet_leads`, `internet_leads_closed`, and `self_generated_deals` columns
- For weekly/monthly: calculate contracts as `closed_deals + canvass_deals_closed` (since these are the available columns)
- Add a database migration to add `self_generated_deals`, `internet_leads`, and `internet_leads_closed` columns to `weekly_user_metrics` for future accuracy

### File 2: `src/pages/dashboard/AdminOverview.tsx`

**Progress bar colors:**
- Change the Canvass Contracts progress bar from `bg-primary` to `bg-emerald-500` (green)
- Keep Self-Generated as `bg-accent` (red/pink)
- Keep Internet as `bg-blue-500`
- This ensures all three bars have distinct, visible colors

**LtC source breakdown:**
- Add a new "Lead-to-Close by Source" section below Contract Sources showing:
  - Canvass Close %: `canvass_deals_closed / canvass_leads`
  - Internet Close %: `internet_leads_closed / internet_leads`
  - Combined Close %: `(canvass + internet closed) / (canvass + internet leads)`
- Self-Generated is excluded from LtC (already noted in existing UI)

### File 3: Database Migration

Add columns to `weekly_user_metrics`:
- `self_generated_deals` (integer, default 0)
- `internet_leads` (integer, default 0)  
- `internet_leads_closed` (integer, default 0)

This ensures weekly and monthly breakdowns can track all three lead sources going forward.

## Summary of Fixes

| Problem | Root Cause | Fix |
|---|---|---|
| Email contracts = 10 (should be 20) | Uses `closed_deals` column, misses self-gen | Use `self_generated_deals + canvass_deals_closed + internet_leads_closed` |
| Email leads = 1 (should be 3) | Uses legacy `leads` column | Use `canvass_leads + internet_leads` |
| Progress bars lack color | Canvass bar uses `bg-primary` (black) | Change to `bg-emerald-500` |
| LtC only combined | Single LtC % in summary | Add per-source breakdown (Self-Gen, Canvass, Internet) |

