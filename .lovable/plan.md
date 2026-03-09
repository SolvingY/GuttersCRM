

# Combined Plan: Scoreboard Restructure, Revenue Move, Company Goals + Weekly Updates + TimeClock Carousel Conversion

## Changes

### 1. `src/pages/dashboard/AdminOverview.tsx` — Scoreboard Restructure
- **Replace `<Tabs>`** (Sales Reps / Canvassers / Supplementers) with a `<SectionCarousel>` containing 5 items: "Sales Reps", "Canvassers", "Supplementers", "Sales Leaderboard", "Canvasser Leaderboard"
- **Remove `RevenueAnalyticsWidget`** from the Sales tab content
- **Remove the red "Canvassers Need Attention" alert** box
- **Shorten** "Total Approved Revenue" stat card title to "Approved Revenue"
- Leaderboard items will embed existing `LeaderboardTable` and `WeeklyCanvasserLeaderboardTable` components

### 2. `src/pages/admin/Leads.tsx` — Add Revenue Widget
- Add a `SectionCarousel` at the top with a single "Revenue from Leads" item containing the `RevenueAnalyticsWidget`

### 3. `src/pages/admin/CompanyGoals.tsx` — AccordionButtons → SectionCarousel
- Replace the 5 `AccordionButton` sections (Fiscal Year Goals, Revenue & Collections, Contract Progress, Additional Metrics, Internet Metrics) with `SectionCarousel.Item` entries
- Content inside each section stays identical

### 4. `src/pages/admin/WeeklyUpdates.tsx` — Tabs → SectionCarousel
- Replace the `<Tabs>` with Sales Reps / Canvassers tabs with a `SectionCarousel` containing two items: "Sales Reps" and "Canvassers"
- Content inside each tab stays identical

### 5. `src/pages/admin/AdminTimeClock.tsx` — Collapsibles → SectionCarousel
- Replace the 5 `Collapsible` sections (Hours Tracker, Pay Period Daily Activity, Shift Management, Shift History, Geofence Work Zones) with `SectionCarousel.Item` entries
- The filter/navigation controls within each section header will move inside the section content area (since the carousel trigger is just a pill button)
- Content inside each section stays identical

### Files Modified

| File | Change |
|------|--------|
| `AdminOverview.tsx` | Tabs→SectionCarousel with 5 items, remove revenue widget, remove canvasser alert, fix stat title |
| `Leads.tsx` | Add SectionCarousel with Revenue from Leads |
| `CompanyGoals.tsx` | AccordionButtons→SectionCarousel |
| `WeeklyUpdates.tsx` | Tabs→SectionCarousel |
| `AdminTimeClock.tsx` | Collapsibles→SectionCarousel |

