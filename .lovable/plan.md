

## Fix Lead Counting Trigger and Move Internet Metrics to Company Goals

### Summary

Three fixes: (1) Add a BEFORE INSERT trigger so auto-assigned leads get counted immediately, plus a one-time data fix for existing uncounted leads; (2) Move the 5 internet metric cards from AdminOverview to the Company Goals page; (3) Keep the AdSpendCard edit button as the entry point for ad spend tracking on Company Goals.

---

### Fix 1: Database Migration

**A. New BEFORE INSERT trigger on `quote_requests`:**

A new function `count_lead_on_insert_assign()` will fire BEFORE INSERT. If `assigned_to` is set (by auto-assignment) and `counted_as_lead` is false, it increments the appropriate `user_metrics` counter (`internet_leads` or `canvass_leads`) and marks the lead as counted.

Trigger naming ensures correct execution order: `auto_assign_lead` (existing, sets `assigned_to`) runs before `count_lead_on_insert_assign` (new, counts it) alphabetically.

**B. One-time data fix in the same migration:**

- Update `user_metrics.internet_leads` for all reps who have uncounted internet leads assigned to them
- Update `user_metrics.canvass_leads` for any uncounted canvasser leads
- Mark all previously uncounted leads as `counted_as_lead = TRUE`

This will fix Dru's missing lead count immediately.

---

### Fix 2: Move Internet Metric Cards

**Remove from `src/pages/dashboard/AdminOverview.tsx`:**
- Remove imports for InternetLeadsCard, AdSpendCard, InternetLeadCloseRateCard, InternetCostPerLeadCard, InternetCostPerContractCard
- Remove the "Internet Lead Metrics" grid section (lines 672-679)

**Add to `src/pages/admin/CompanyGoals.tsx`:**
- Import the 5 internet metric cards
- Add a new "Internet / Call-In Lead Metrics" section after the existing "Additional Metrics Cards" grid (after line 766), with a heading, description, and a responsive grid containing all 5 cards

---

### Fix 3: Ad Spend on Company Goals

The AdSpendCard already has an edit button that opens the AdSpendDialog for entering/updating monthly ad spend. By moving it to the Company Goals page, it naturally sits alongside the canvass cost metrics for comparison. No additional ad spend budget field is needed since the existing `target_cost_per_lead` field in company goals already serves as the budget benchmark.

---

### Files Changed

| File | Change |
|---|---|
| New migration SQL | BEFORE INSERT trigger + data fix for uncounted leads |
| `src/pages/dashboard/AdminOverview.tsx` | Remove 5 internet metric card imports and grid |
| `src/pages/admin/CompanyGoals.tsx` | Add 5 internet metric cards in new section |

---

### Technical Details

**Migration SQL creates:**

```text
-- Function: count_lead_on_insert_assign()
-- Trigger: BEFORE INSERT on quote_requests
-- Data fix: UPDATE user_metrics + UPDATE quote_requests for uncounted leads
```

**AdminOverview.tsx changes:**
- Remove lines 20-24 (imports)
- Remove lines 672-679 (Internet Lead Metrics grid)

**CompanyGoals.tsx changes:**
- Add imports for the 5 cards at top
- Add new section after line 766 (after the Cost Per Lead card's closing div):

```text
-- "Internet / Call-In Lead Metrics" heading
-- Description text
-- Grid with: InternetLeadsCard, AdSpendCard, InternetLeadCloseRateCard, InternetCostPerLeadCard, InternetCostPerContractCard
```

This creates the intended comparison: canvass metrics (Lead-to-Close Rate, Cost Per Contract, Cost Per Lead) sit directly above the internet equivalents on the same page.

