

## Plan: Fix Canvasser Goals, Leaderboard Display, and Remove Hours

### Overview

This plan addresses four key issues:

1. **Expand Canvasser Goals** - Change from a single "Yearly Goal (Leads Closed)" to three separate goals: Contracts (Leads Closed), Leads Set, and Income
2. **Fix Canvasser Leaderboard Visibility** - Canvassers can only see their own data on the leaderboard due to RLS policies - need to add a policy allowing all authenticated users to view canvasser metrics for leaderboard purposes
3. **Standardize Leaderboard Stats** - Make Yearly, Monthly, and Weekly leaderboards display the same statistics
4. **Remove Hours from Leaderboard** - Hours should only be visible to admins and the individual user, not on public leaderboards

---

### Part 1: Database Schema Changes

#### 1.1 Add New Goal Columns to canvasser_metrics

```sql
-- Add leads_set_goal and income_goal columns
ALTER TABLE public.canvasser_metrics
ADD COLUMN IF NOT EXISTS leads_set_goal integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS income_goal numeric DEFAULT 0;

-- Rename yearly_goal to contracts_goal for clarity (or keep as yearly_goal representing contracts)
-- We'll keep yearly_goal as the "contracts/leads closed" goal for backward compatibility
```

#### 1.2 Add RLS Policy for Leaderboard Visibility

The core issue: The `canvasser_metrics` table only has these SELECT policies:
- "Admins can view all canvasser metrics" - `has_role(auth.uid(), 'admin')`
- "Canvassers can view their own metrics" - `user_id = auth.uid()`

This means canvassers cannot see other canvassers' data for the leaderboard!

**Solution**: Add a new RLS policy similar to what exists on `user_metrics`:

```sql
-- Add policy allowing authenticated users to view all canvasser metrics for leaderboard
CREATE POLICY "Authenticated users can view all canvasser metrics for leaderboard"
ON public.canvasser_metrics
FOR SELECT
TO authenticated
USING (true);
```

---

### Part 2: Update Goal Modal and Settings

#### 2.1 Update CanvasserGoalModal - `src/components/canvasser/CanvasserGoalModal.tsx`

**Current**: Single input for "Yearly Leads Closed Goal"

**New**: Three inputs:
- **Contracts Goal** (Leads Closed) - current yearly_goal
- **Leads Set Goal** - new leads_set_goal column
- **Income Goal** - new income_goal column

**Changes:**
1. Add state for all three goals: `contractsGoal`, `leadsSetGoal`, `incomeGoal`
2. Check if any goals are unset (all three = 0) to trigger modal
3. Update form to have three input fields with labels
4. Update save logic to update all three goal columns

#### 2.2 Update CanvasserSettings - `src/pages/canvasser/CanvasserSettings.tsx`

**Current**: Single "Yearly Goal (Leads Closed)" field

**New**: Three goal fields:
- Contracts Goal (Leads Closed)
- Leads Set Goal
- Income Goal

**Changes:**
1. Add state for new goals: `leadsSetGoal`, `incomeGoal`
2. Update `fetchSettings()` to select new columns
3. Add input fields for each goal type
4. Update `handleSave()` to save all three goals

---

### Part 3: Fix Canvasser Leaderboard Data

#### 3.1 Update CanvasserLeaderboard - `src/pages/canvasser/CanvasserLeaderboard.tsx`

**Issues to Fix:**

1. **Visibility Problem**: The view `canvasser_metrics_leaderboard` uses `security_invoker=on` which respects RLS. Once we add the new RLS policy, this will work correctly.

2. **Standardize Stats Across All Timeframes**: Currently:
   - **YTD Tab** shows: Place, Canvasser, Yearly Goal, YTD Closed, Doors Knocked, Until Goal, % of Goal, Points, Contests Won
   - **Weekly/Monthly Tab** shows: Place, Canvasser, Doors, Convos, Not Int., Leads Set, w/ Damage, w/o Damage, Closed, Hours, Points

**New Standardized Columns** (remove Hours from all):
| Place | Canvasser | Doors | Leads Set | w/ Damage | w/o Damage | Closed | Points |

3. **Filter Out Archived/Deleted Users**: Join with profiles table to filter `is_archived = false`

**Changes to YTD fetch:**
```typescript
// After adding RLS policy, fetch will work for all canvassers
// Filter archived users by joining profiles
const { data: activeProfiles } = await supabase
  .from('profiles')
  .select('id')
  .eq('is_archived', false);
  
const activeUserIds = new Set(activeProfiles?.map(p => p.id) || []);

// Then filter results
const filteredEntries = sorted.filter(entry => activeUserIds.has(entry.userId));
```

**Changes to Weekly/Monthly fetch:**
- Already filtering by weekly_canvasser_metrics
- Add filtering for archived users
- Remove `hoursWorked` from the entry objects and display

---

### Part 4: Update Leaderboard Table Components

#### 4.1 Update CanvasserLeaderboardTable - `src/components/dashboard/CanvasserLeaderboardTable.tsx`

**Current columns**: Place, Canvasser, Yearly Goal, YTD Closed, Doors Knocked, Until Goal, % of Goal, Points, Contests Won

**New columns** (matching weekly/monthly style, without hours):
| Place | Canvasser | Doors | Leads Set | w/ Damage | w/o Damage | Closed | Points |

**Note**: Goal tracking (Yearly Goal, Until Goal, % of Goal) can remain on YTD table since it's meaningful there.

**Changes:**
1. Keep goal-related columns for YTD view (they make sense there)
2. Add Leads Set column
3. Add w/ Damage and w/o Damage columns
4. Remove Contests Won from display (can stay in tooltip)

#### 4.2 Update WeeklyCanvasserLeaderboardTable - `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx`

**Current columns**: Place, Canvasser, Doors, Convos, Not Int., Leads Set, w/ Damage, w/o Damage, Closed, **Hours**, Points

**New columns** (remove Hours):
| Place | Canvasser | Doors | Convos | Not Int. | Leads Set | w/ Damage | w/o Damage | Closed | Points |

**Changes:**
1. Remove `hoursWorked` from interface (or keep for admin use)
2. Remove Hours column from table header (line 61)
3. Remove Hours cell from table body (line 116)

#### 4.3 Consider Prop for Admin-Only Hours Display

Since admins should still see hours:

```typescript
interface WeeklyCanvasserLeaderboardTableProps {
  entries: WeeklyCanvasserEntry[];
  currentUserId?: string;
  showHours?: boolean;  // NEW: Only true for admin views
}
```

Then conditionally render Hours column only when `showHours={true}`.

---

### Part 5: Update Admin Leaderboards

#### 5.1 Update AdminLeaderboards - `src/pages/admin/AdminLeaderboards.tsx`

**Changes:**
1. Filter archived users from all leaderboard displays
2. Keep Hours column visible for admins (pass `showHours={true}` to table component)
3. Ensure data fetching includes all new metrics

---

### Part 6: Update Canvasser Stats Page

#### 6.1 Update CanvasserStats - `src/pages/canvasser/CanvasserStats.tsx`

**Changes:**
1. Fetch new goal columns: `leads_set_goal`, `income_goal`
2. Display all three goals in the UI with progress indicators
3. Show goal progress for each category (Contracts, Leads Set, Income)

---

### Summary of Files to Create/Modify

| File/Resource | Action | Description |
|---------------|--------|-------------|
| Database Migration | Create | Add `leads_set_goal`, `income_goal` columns and new RLS policy |
| `src/components/canvasser/CanvasserGoalModal.tsx` | Modify | Update to three goal inputs |
| `src/pages/canvasser/CanvasserSettings.tsx` | Modify | Add three goal input fields |
| `src/pages/canvasser/CanvasserLeaderboard.tsx` | Modify | Filter archived users, remove hours from display |
| `src/components/dashboard/CanvasserLeaderboardTable.tsx` | Modify | Add missing columns (leads set, damage stats) |
| `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx` | Modify | Remove Hours column for canvasser view, add `showHours` prop |
| `src/pages/admin/AdminLeaderboards.tsx` | Modify | Pass `showHours={true}` to canvasser tables |
| `src/pages/canvasser/CanvasserStats.tsx` | Modify | Display all three goal types with progress |

---

### Technical Implementation Details

**RLS Fix:**
The key fix is adding the RLS policy to allow authenticated users to see all canvasser metrics. Currently, the `canvasser_metrics_leaderboard` view respects RLS (`security_invoker=on`), and canvassers can only see their own row, which breaks the leaderboard.

**Hours Visibility:**
- Hours will be tracked in the database and displayed to admins
- The `showHours` prop on the table component controls column visibility
- Canvasser portal leaderboards will pass `showHours={false}` (or omit)
- Admin leaderboards will pass `showHours={true}`

**Goal Structure:**
- **Contracts Goal** (yearly_goal) - Number of leads closed target
- **Leads Set Goal** (leads_set_goal) - Number of leads set target
- **Income Goal** (income_goal) - Dollar amount income target

**Archived User Filtering:**
- All leaderboard queries will join/filter against profiles table
- Only users with `is_archived = false` will be displayed
- This prevents showing "old deleted stats" on leaderboards

