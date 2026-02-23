

# Standardize Sales Rep Leaderboards + Make Sections Collapsible

## Part 1: Unified Sales Rep Leaderboard (All 3 Timeframes)

### Problem
The YTD sales leaderboard uses `LeaderboardTable` with columns like Rank, Rep Goals, Amount Until Goal, % of Goal, and Contests Won. The Weekly/Monthly views use `WeeklyLeaderboardTable` which has different columns (Leads, Close %) but is missing Rank, Goals, Amount Until Goal, % of Goal, and Contests Won.

The user wants all three timeframes (YTD, Weekly, Monthly) to display the same columns, and for weekly/monthly to show only that time period's data.

### Target Columns (All 3 Timeframes)
Place | Rep Name | Rank | Rep Goals | Approved Rev | Collections | Contracts | Close % | Amount til Goal | % of Goal | Points | Contests Won

### Changes

**1. LeaderboardTable.tsx -- Add Close % column**
- Add a "Close %" column header between "Total Contracts" and "Amount Until Goal"
- Add Close % calculation per row: `leads > 0 ? (closedDeals / leads) * 100 : 0` and display it
- Update the footer: move the existing Close % display (currently in the % of Goal column) to the new Close % column, and show a dash in % of Goal footer

**2. Leaderboard.tsx (Sales Rep Dashboard) -- Use LeaderboardTable for all 3 tabs**
- Change `weeklyEntries` and `monthlyEntries` state types from `WeeklyLeaderboardEntry[]` to `LeaderboardEntry[]`
- Update weekly fetch: after getting weekly data, also fetch each user's `salesRank`, `yearlyGoal`, `contestsWon`, `contestPoints`, `wagerPoints` from `user_metrics` and `contests` tables. Map all fields into `LeaderboardEntry` format.
- Update monthly aggregation: same enrichment as weekly - fetch static YTD fields and merge them.
- Replace `<WeeklyLeaderboardTable>` with `<LeaderboardTable>` for both Monthly and Weekly tabs.
- Remove unused `WeeklyLeaderboardEntry` interface and `WeeklyLeaderboardTable` import.

**3. AdminLeaderboards.tsx (Admin Dashboard) -- Same changes**
- Change `salesWeeklyEntries` state type from `WeeklySalesEntry[]` to match `SalesRepEntry[]` (with all LeaderboardTable fields).
- Update weekly/monthly fetch: enrich with `salesRank`, `yearlyGoal`, `contestsWon`, `contestPoints`, `wagerPoints` from `user_metrics` and `contests` tables.
- Replace `<WeeklyLeaderboardTable entries={salesWeeklyEntries} />` with `<LeaderboardTable entries={salesWeeklyEntries} />` for weekly/monthly.
- Remove unused `WeeklySalesEntry` interface and `WeeklyLeaderboardTable` import.

### Weekly/Monthly Data Notes
- `approvedRevenue`, `collections`, `closedDeals`, `leads`, `pointsEarned` come from `weekly_user_metrics` (time-scoped)
- `salesRank`, `yearlyGoal` come from `user_metrics` (current/YTD values - same across all views)
- `contestsWon` comes from `contests` table (YTD total - same across all views)
- `contestPoints`, `wagerPoints` come from `user_metrics` (YTD)
- `Amount Until Goal` = max(0, yearlyGoal - approvedRevenue) -- for weekly/monthly this shows goal minus that period's revenue
- `% of Goal` = (approvedRevenue / yearlyGoal) * 100

---

## Part 2: Collapsible Sections in Master Overview (AdminOverview.tsx)

### Problem
The Master Overview page has many sections that make it overwhelming. The user wants the following sections wrapped in collapsible containers:

### Sections to Make Collapsible
1. **Contract Sources** card (lines 877-932) -- the self-gen/canvass/internet comparison
2. **Users Needing Attention** alert (lines 934-946)
3. **Sales Rep Performance** table (lines 948-1073)
4. **Conversion Funnel** (lines 1092-1102)
5. **Canvasser Hours Tracker** (lines 1104-1245)
6. **Canvassers Needing Attention** alert (lines 1247-1258)
7. **Canvasser Performance** table (lines 1261-1326)

### Implementation
- Import `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` from `@/components/ui/collapsible`
- Import `ChevronDown`, `ChevronRight` icons
- Add state variables for each collapsible section (e.g., `contractSourcesOpen`, `salesPerfOpen`, etc.)
- Wrap each section with `<Collapsible>` using the same pattern already used in `MyStats.tsx`
- Default all sections to collapsed (false) so the page is clean on load

---

## Part 3: Collapsible Sections in Company Goals (CompanyGoals.tsx)

### Sections to Make Collapsible
1. **Fiscal Year Goals** form card (lines 518-659)
2. **Progress Cards Row 1** - Revenue + Collections (lines 662-747)
3. **Progress Cards Row 2** - Contract Progress (lines 750-873)
4. **Additional Metrics** - Lead-to-Close, Cost Per Contract, Cost Per Lead (lines 876-1023)
5. **Internet / Call-In Lead Metrics** section (lines 1025-end)

### Implementation
- Same collapsible pattern as above
- Default all to collapsed except the Progress Cards

---

## Part 4: Collapsible Lead Cards in Sales Rep Dashboard (MyStats.tsx)

The MyStats page already has collapsible sections implemented. No changes needed there -- the user may be referring to sections in the overview pages which are addressed in Parts 2 and 3 above.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/LeaderboardTable.tsx` | Add Close % column |
| `src/pages/dashboard/Leaderboard.tsx` | Use `LeaderboardTable` for all 3 tabs; enrich weekly/monthly with rank, goals, contests |
| `src/pages/admin/AdminLeaderboards.tsx` | Use `LeaderboardTable` for all 3 sales tabs; enrich weekly/monthly |
| `src/pages/dashboard/AdminOverview.tsx` | Wrap major sections in collapsible containers |
| `src/pages/admin/CompanyGoals.tsx` | Wrap major sections in collapsible containers |

