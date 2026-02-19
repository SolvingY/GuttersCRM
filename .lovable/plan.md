

# Supplementer Portal Complete Feature Parity + Weekly Updates Integration

This plan adds the missing features to bring the Supplementer portal to full parity with Sales and Canvasser portals, and integrates supplementer daily data entry into the Admin Weekly Updates page.

---

## 1. Fix Points Tooltip Not Displaying (SupplementerLeaderboard.tsx)

The "How points work" tooltip doesn't render because it's missing a `TooltipProvider` wrapper. Wrap the existing `Tooltip` component in a `TooltipProvider`.

---

## 2. Add Weekly/Monthly/YTD Tabs to Leaderboard (SupplementerLeaderboard.tsx)

Currently only shows YTD with no tabs. Rewrite to match the canvasser leaderboard pattern:

- Add `Tabs` with "Yearly", "Weekly", and "Monthly" options
- **Yearly**: Existing fetch from `supplementer_metrics` (no change)
- **Weekly**: Fetch from `weekly_supplementer_metrics` with week navigation (prev/next buttons, date display)
- **Monthly**: Aggregate `weekly_supplementer_metrics` for the selected month with month navigation
- Add Team Totals footer row for all tabs
- Add realtime subscription on both tables
- Columns remain: Rank, Name, Points (bold), RCV Increased, Collected, Rate, Avg COC

---

## 3. Add The Pit and Points History to Supplementer Portal

### New Files:
- **`src/pages/supplementer/SupplementerPit.tsx`** -- Copy of the CanvasserPit pattern. Queries the same `pit_wager_events`, `pit_wager_options`, and `pit_wagers` tables. Uses the supplementer's points from `supplementer_metrics` instead of `canvasser_metrics` for balance display and wagering.
- **`src/pages/supplementer/SupplementerPointsHistory.tsx`** -- Copy of the CanvasserPointsHistory pattern. Shows `pit_point_transactions`, `contest_victories`, and wager history for the logged-in supplementer.

### Modified Files:
- **`src/components/supplementer/SupplementerSidebar.tsx`** -- Add "The Pit" (Flame icon, `/supplementer/pit`) and "Points History" (Award icon, `/supplementer/points-history`) nav items
- **`src/App.tsx`** -- Add two new routes under `/supplementer`:
  - `path="pit"` -> `SupplementerPit`
  - `path="points-history"` -> `SupplementerPointsHistory`

---

## 4. Add Fiscal Year Progress + Goal Progress + 52-Week Chart to Dashboard (SupplementerDashboard.tsx)

Add three collapsible sections following the CanvasserStats pattern:

- **Fiscal Year Progress**: Dec 15 2025 - Dec 15 2026 progress bar with days remaining count (uses constants from `lib/constants.ts`)
- **Goal Progress**: RCV yearly goal progress bar (`total_rcv_increased` vs `yearly_goal` from `supplementer_metrics`)
- **52-Week Progress Chart**: `ComposedChart` (from recharts) showing:
  - Weekly RCV increased as bars (from `weekly_supplementer_metrics`)
  - Cumulative RCV as a line
  - Goal pace as a dashed line (`yearly_goal / 52` per week, cumulative)
  - Fetches all weekly data within the fiscal year date range

---

## 5. Add Supplementers Tab to Admin Weekly Updates (WeeklyUpdates.tsx)

This is the key new addition. The Weekly Updates page currently has two tabs: "Sales Reps" and "Canvassers". We add a third tab: "Supplementers".

### Changes to `src/pages/admin/WeeklyUpdates.tsx`:

**New interface:**
```text
SupplementerWeeklyEntry {
  userId: string
  displayName: string
  weeklySupplementsCompleted: string
  weeklyRcvIncreased: string
  weeklyMoneyCollected: string
  weeklyAvgCocDays: string
  weeklyAvgDepreciationDays: string
  weeklyAvgCodeDays: string
}
```

**New state:**
- `supplementers` -- list of supplementer metrics (fetched from `supplementer_metrics`)
- `supplementerEntries` -- editable form entries for each supplementer

**Fetch logic (in `fetchUsers`):**
- Query `supplementer_metrics` joined with role check (users with `supplementer` role)
- Filter out archived users
- Initialize `supplementerEntries` with empty strings

**New update helper:**
- `updateSupplementerEntry(userId, field, value)` -- same pattern as sales/canvasser

**Save logic (in `handleSaveAll`):**
For each supplementer entry with non-zero values:
1. Fetch current `supplementer_metrics` for the user
2. Add deltas to YTD totals (`total_rcv_increased`, `total_money_collected`, `total_supplements_processed`)
3. Recalculate points: `floor(new_rcv / 1000) + floor(new_collected / 2000) + existing_coc_bonus`
4. Update `supplementer_metrics` with new totals
5. Upsert into `weekly_supplementer_metrics` (compound values if record exists for that week), using `onConflict: 'user_id,week_start'`
6. Reset form entries after save

**Points formula:**
- 1 pt per $1,000 RCV increase
- 1 pt per $2,000 collected
- COC bonus points are NOT recalculated here (those come from job completions via triggers)
- Weekly points: `floor(compounded_rcv / 1000) + floor(compounded_collected / 2000)`

**Tab UI:**
- Change `TabsList` to include three tabs: Sales Reps, Canvassers, Supplementers
- Add `TabsContent value="supplementers"` with header row and input grid:
  - Team Member | Supplements Done | RCV Increased ($) | Money Collected ($) | Avg COC Days | Avg Depreciation Days | Avg Code Days
- Same responsive layout pattern as canvassers (hidden headers on mobile, card layout on mobile)

**Reset logic:**
- Add supplementer entries reset alongside sales/canvasser resets after save

---

## 6. Database: Add Unique Constraint to `weekly_supplementer_metrics`

The `weekly_supplementer_metrics` table needs a unique constraint on `(user_id, week_start)` to support the upsert `onConflict` used by the Weekly Updates save logic.

**Migration SQL:**
```text
ALTER TABLE public.weekly_supplementer_metrics
ADD CONSTRAINT weekly_supplementer_metrics_user_id_week_start_key
UNIQUE (user_id, week_start);
```

---

## 7. Lead-to-Supplementer Job Assignment (LeadDetail.tsx)

When a lead has `status = 'won'`, add a "Create Supplement Job" button/dialog:
- Pre-fills client name, address, and any insurance info from the lead's `form_data`
- Dropdown to select a supplementer (fetched from `supplementer_metrics` + active profiles)
- Fields: Original RCV, Insurance Carrier, Claim Number
- On submit: inserts into `supplement_jobs` and logs to `lead_activity_log`

---

## Files Summary

### New Files (2)
| File | Description |
|---|---|
| `src/pages/supplementer/SupplementerPit.tsx` | The Pit wagering page for supplementers (same tables as sales/canvasser) |
| `src/pages/supplementer/SupplementerPointsHistory.tsx` | Points transaction history for supplementers |

### Modified Files (6)
| File | Changes |
|---|---|
| `src/pages/supplementer/SupplementerLeaderboard.tsx` | Fix tooltip, add Weekly/Monthly/YTD tabs with navigation and team totals |
| `src/pages/supplementer/SupplementerDashboard.tsx` | Add collapsible fiscal year progress, goal progress, and 52-week chart |
| `src/components/supplementer/SupplementerSidebar.tsx` | Add The Pit and Points History nav items |
| `src/App.tsx` | Add pit and points-history routes under /supplementer |
| `src/pages/admin/WeeklyUpdates.tsx` | Add Supplementers tab with daily entry form, save logic compounding into YTD and weekly metrics |
| `src/pages/admin/LeadDetail.tsx` | Add "Create Supplement Job" button/dialog for won leads |

### Database Migration (1)
| Change | Description |
|---|---|
| Unique constraint on `weekly_supplementer_metrics(user_id, week_start)` | Required for upsert operations in Weekly Updates save logic |

