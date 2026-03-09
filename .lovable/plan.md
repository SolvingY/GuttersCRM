

# Fix Ad Spend Saving, Internet Close Rate, and Scoreboard Leaderboard Views

## Issues Identified

### 1. Ad Spend Not Updating Calculations
The `AdSpendDialog` invalidates queries with the key `['ad-spend-ytd']`, but the Company Goals page queries `['ad-spend-ytd', fyYearStart]` (includes the fiscal year start as part of the key). The invalidation misses because the keys don't match. Additionally, the `selectedMonth` dropdown doesn't visually update after saving.

**Fix:** In `AdSpendDialog.handleSubmit`, invalidate with a broader match: `queryClient.invalidateQueries({ queryKey: ['ad-spend-ytd'], exact: false })` or pass `{ queryKey: ['ad-spend-ytd'] }` which already does prefix matching. Actually the current code should work with prefix matching — let me verify. The real issue is that `queryClient.invalidateQueries({ queryKey: ["ad-spend-ytd"] })` should match `['ad-spend-ytd', fyYearStart]` by default (prefix matching). But the Company Goals page also invalidates on close with `queryKey: ['ad-spend-ytd']` without the second param. This should work. The issue is likely that the `history` query (`ad-spend-history`) is invalidated, but the `ad-spend-ytd` query on the Company Goals page may not re-fetch because it's on a different component. Need to also invalidate `internet-leads-month` and related queries. Additionally, the `onOpenChange` callback in CompanyGoals only invalidates on dialog close but the dialog itself also invalidates on save — both should work together.

**Actual fix needed:** The `AdSpendDialog` saves successfully but the Company Goals `ad-spend-ytd` query uses `['ad-spend-ytd', fyYearStart]`. The dialog invalidates `['ad-spend-ytd']` which should prefix-match. This should work with React Query. The real issue may be that the `monthlyBreakdown` and `ytdTotal` are derived values computed during render — they recalculate when `adSpendYTD` changes. Let me check if the month matching is wrong: `adSpendYTD.find(e => e.month === monthKey)` — the `monthKey` is formatted as `yyyy-MM-dd` (e.g., `2026-01-01`). The `ad_spend_tracking.month` column stores dates. If the DB returns `2026-01-01` but the format comparison doesn't match (e.g., `2026-01-01T00:00:00` vs `2026-01-01`), that could cause a mismatch. This is likely the bug — need to normalize the month comparison.

**Fix in `CompanyGoals.tsx`:** Normalize month comparison: `e.month?.substring(0, 10) === monthKey` or use `startsWith`.

### 2. Internet Lead-to-Close Rate Not Counting Lost Deals
The close rate calculation at line 791 uses `internetClosedCount / internetLeadCount`. The `internetClosedCount` comes from `user_metrics.internet_leads_closed` (YTD from metrics table). The `internetLeadCount` comes from `quote_requests` filtered to current month internet leads. These are mismatched timeframes and the denominator doesn't include lost deals.

**Fix:** The close rate should use consistent data. Use `internetTotalLeads` (from `user_metrics.internet_leads`) as the denominator, which already includes all internet leads assigned (won + lost). Change line 791 from `internetData.internetLeadCount` to `internetData.internetTotalLeads` for the close rate calculation. Also update the display text. This ensures lost deals are counted in the denominator.

Alternatively, query `quote_requests` for all internet leads with statuses including `lost` and `won`/`scheduled`/`completed` to get a proper close rate from real lead data rather than metrics. But using the metrics data is consistent with the rest of the system.

### 3. Scoreboard Leaderboard Needs Weekly/Monthly/Yearly Tabs
Currently the Sales Leaderboard and Canvasser Leaderboard items in the Scoreboard just show YTD data from `userDetails`/`canvasserDetails`. Need to add Weekly/Monthly/Yearly tab selectors with date navigation, similar to the full `AdminLeaderboards` page.

**Fix:** Embed the full leaderboard logic (or import `AdminLeaderboards` content) inside each SectionCarousel.Item. Add `Tabs` with Weekly/Monthly/YTD inside the leaderboard carousel items, with date navigation arrows. This requires fetching weekly and monthly metrics data in addition to the YTD data already available.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/CompanyGoals.tsx` | Fix month comparison normalization for ad spend; fix close rate to use `internetTotalLeads` as denominator |
| `src/components/admin/AdSpendDialog.tsx` | Ensure query invalidation covers all relevant keys |
| `src/pages/dashboard/AdminOverview.tsx` | Add Weekly/Monthly/YTD tabs with date navigation inside Sales Leaderboard and Canvasser Leaderboard carousel items; fetch weekly/monthly metrics data |

