

## Fix: Internet Cost Metrics Should Use YTD Ad Spend

### Problem
The **Internet Cost Per Contract** and **Internet Cost Per Lead** cards currently use only the **current month's** ad spend ($1,200) instead of the **cumulative YTD** ad spend ($2,400). With $2,400 total spend and 1 internet lead/contract, both metrics should show $2,400.

### Fix
In `src/pages/admin/CompanyGoals.tsx`, change 3 references from `internetData.currentMonthAdSpend` to `internetData.adSpend`:

**Internet Cost Per Contract card (line 1184):**
- Change: `internetData.currentMonthAdSpend / internetData.internetContractsWon`
- To: `internetData.adSpend / internetData.internetContractsWon`

**Internet Cost Per Lead card (lines 1237 and 1240):**
- Change both occurrences of `currentMonthAdSpend` to `adSpend`

Also update the descriptive text on lines 1198 and 1250 that says "spent" to reflect it's the YTD amount.

### Expected Result
- Ad Spend YTD: $2,400
- Internet Leads: 1
- Internet Contracts: 1
- Cost Per Lead: $2,400 / 1 = **$2,400**
- Cost Per Contract: $2,400 / 1 = **$2,400**

