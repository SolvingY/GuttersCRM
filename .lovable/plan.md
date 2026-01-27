

## Plan: Add New Canvasser Metrics and Update Cost Per Lead Calculation

### Overview

This plan adds three new canvasser metrics (**Conversations Had**, **Not Interested**, **Without Damage**), renames **Shifts** to **Hours Worked**, and updates the **Cost Per Lead** calculation to use the formula: **Total Income for combined Canvassers / Leads Closed**.

---

### Part 1: Database Schema Changes

**Migration Required** - Add 3 new columns to canvasser tables:

```sql
-- Add new columns to canvasser_metrics
ALTER TABLE public.canvasser_metrics
ADD COLUMN conversations_had integer DEFAULT 0,
ADD COLUMN not_interested integer DEFAULT 0,
ADD COLUMN leads_without_damage integer DEFAULT 0,
ADD COLUMN hours_worked numeric DEFAULT 0;

-- Add new columns to weekly_canvasser_metrics
ALTER TABLE public.weekly_canvasser_metrics
ADD COLUMN conversations_had integer DEFAULT 0,
ADD COLUMN not_interested integer DEFAULT 0,
ADD COLUMN leads_without_damage integer DEFAULT 0,
ADD COLUMN hours_worked numeric DEFAULT 0;

-- Add new columns to daily_canvasser_metric_entries
ALTER TABLE public.daily_canvasser_metric_entries
ADD COLUMN conversations_had_delta integer DEFAULT 0,
ADD COLUMN not_interested_delta integer DEFAULT 0,
ADD COLUMN leads_without_damage_delta integer DEFAULT 0,
ADD COLUMN hours_worked_delta numeric DEFAULT 0;
```

**Note:** The existing `shifts_worked` column will remain for backwards compatibility but we'll stop using it in favor of `hours_worked`.

---

### Part 2: Files to Modify

#### 2.1 Admin Daily Updates - `src/pages/admin/WeeklyUpdates.tsx`

**Changes:**
1. Update `CanvasserMetric` interface (line 38-46) to add new fields
2. Update `CanvasserWeeklyEntry` interface (line 48-57) to add:
   - `weeklyConversationsHad`
   - `weeklyNotInterested`
   - `weeklyLeadsWithoutDamage`
   - `weeklyHoursWorked`
3. Update `fetchUsers()` to select new columns
4. Update `handleSaveAll()` to save new fields to all three tables
5. Update the Canvasser input form (lines 664-761) to:
   - Add input fields for new metrics
   - Rename "Shifts" label to "Hours Worked"
   - Add "Conversations Had", "Not Interested", "Without Damage" input fields

**Header row changes (line 673-681):**
```
| Team Member | Leads Set | Leads Closed | w/ Damage | w/o Damage | Convos | Not Int. | Hours | Doors | Income |
```

---

#### 2.2 Canvasser Stats Page - `src/pages/canvasser/CanvasserStats.tsx`

**Changes:**
1. Update `CanvasserMetrics` interface (lines 16-25) to add new fields
2. Update `WeeklyCanvasserMetric` interface (lines 27-36) to add new fields  
3. Update Key Metrics section (lines 244-258) to:
   - Rename "Shifts Worked" to "Hours Worked"
   - Add new StatsCard components for: Conversations Had, Not Interested, Without Damage
4. Update Recent Weekly Updates display (lines 288-291) to show hours instead of shifts

---

#### 2.3 Canvasser Leaderboard - `src/pages/canvasser/CanvasserLeaderboard.tsx`

**Changes:**
1. Update `WeeklyCanvasserEntry` interface (lines 41-51) to:
   - Rename `shiftsWorked` to `hoursWorked`
   - Add new metric fields
2. Update data fetching and display to use new field names

---

#### 2.4 Weekly Canvasser Leaderboard Table - `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx`

**Changes:**
1. Update `WeeklyCanvasserEntry` interface to rename `shiftsWorked` to `hoursWorked`
2. Update table header (line 54) from "Shifts Worked" to "Hours Worked"
3. Update table cell (line 101) to use `hoursWorked`

---

#### 2.5 Edit Canvasser Metrics Modal - `src/components/dashboard/EditCanvasserMetricsModal.tsx`

**Changes:**
1. Update `CanvasserMetrics` interface (lines 17-28) to add new fields
2. Update form state (lines 40-49) to include new fields
3. Rename "Shifts Worked" label to "Hours Worked" (line 176)
4. Add input fields for: Conversations Had, Not Interested, Without Damage
5. Update database update call to include new fields

---

#### 2.6 Admin Overview - `src/pages/dashboard/AdminOverview.tsx`

**Changes:**
1. Update `CanvasserAggregates` interface (lines 28-34) to:
   - Rename `totalShiftsWorked` to `totalHoursWorked`
   - Add totals for new metrics
2. Update `CanvasserDetail` interface (lines 57-70) to add new fields and rename shift field
3. Update Cost Per Lead calculation (line 509):

**Current calculation:**
```typescript
const actualCostPerLead = canvasserAggregates.totalLeadsClosed > 0 
  ? totalCanvasserIncome / canvasserAggregates.totalLeadsClosed 
  : 0;
```

**Already correct!** The calculation uses Total Canvasser Income / Total Leads Closed.

4. Update any displays showing "Shifts" to "Hours"

---

#### 2.7 Company Goals Page - `src/pages/admin/CompanyGoals.tsx`

**Changes:**
- Verify Cost Per Lead calculation uses correct formula (already correct based on search results)

---

#### 2.8 Report Generator - `src/lib/reportGenerator.ts`

**Changes:**
- Update any canvasser metrics references to use new field names
- Ensure Cost Per Lead in reports uses correct formula

---

### Part 3: Summary of New Metrics

| Old Field | New Field | Description |
|-----------|-----------|-------------|
| `shifts_worked` | `hours_worked` | Renamed from Shifts to Hours Worked (now numeric for partial hours) |
| - | `conversations_had` | NEW: Number of conversations had while canvassing |
| - | `not_interested` | NEW: Number of "not interested" responses |
| - | `leads_with_damage` | EXISTING: Leads that have damage |
| - | `leads_without_damage` | NEW: Leads that don't have damage |

---

### Part 4: Cost Per Lead Calculation

**Formula:** Total Income for Combined Canvassers / Total Leads Closed

**Where it's calculated:**
- `src/pages/dashboard/AdminOverview.tsx` (line 509) - **Already correct**
- `src/pages/admin/CompanyGoals.tsx` (line 348) - **Already correct**
- `src/lib/reportGenerator.ts` - Used in exports - **Already correct**

The current implementation already uses this formula. No changes needed to the calculation logic.

---

### Part 5: Implementation Order

1. **Database Migration** - Add new columns to all three canvasser tables
2. **Type Updates** - Update TypeScript interfaces across all files
3. **Admin WeeklyUpdates** - Add new input fields for data entry
4. **EditCanvasserMetricsModal** - Add new fields to direct edit modal
5. **CanvasserStats** - Display new metrics to canvassers
6. **Leaderboard Components** - Update displays with new field names
7. **AdminOverview** - Update aggregate displays

---

### Technical Notes

- The `hours_worked` field will be `numeric` type to support partial hours (e.g., 7.5 hours)
- Existing `shifts_worked` data will be preserved but the UI will use the new `hours_worked` field
- All interfaces need updating for TypeScript type safety
- The weekly/daily aggregation logic in `handleSaveAll()` will include all new fields

