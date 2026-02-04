
## Plan: Fix Leaderboard Color Schemes, YTD Ranking, and Super Admin Roles

### Summary of Issues to Fix

Based on the screenshots and code analysis, there are 4 distinct issues:

1. **Canvasser YTD Leaderboard not sorting by Points** - The admin leaderboard sorts by percentage of goal first, but per system requirements, canvasser YTD should be sorted by **points in descending order**

2. **YTD Leaderboard Color Scheme using goal-based instead of rank-based** - Per the memory notes: "Yearly (YTD) tables utilize goal-based color coding relative to performance targets, while Weekly and Monthly tables use rank-based color coding." However, looking at the screenshots, all users appear coral/red because they're all below 25% of goal. The user wants **rank-based coloring for all YTD tables** (matching the weekly/monthly approach)

3. **Canvasser YTD rankings showing 0 and "No Goal"** - The table component relies on goals for display, but when no goal is set, it shows confusing "0" values. Need to fix the display when goals aren't set

4. **Super Admin role flexibility** - Current system only allows "Admin Only" OR "Sales/Canvasser". User wants admins to optionally ALSO have Sales and/or Canvasser roles (a "Super Admin" who has Admin + any combination of operational roles)

---

### Part 1: Fix Canvasser YTD Sorting in AdminLeaderboards.tsx

**Problem**: The sorting at lines 411-416 sorts by `percentOfGoal` first, then by `leadsClosed`. Per system requirements, it should sort by **points**.

**File**: `src/pages/admin/AdminLeaderboards.tsx` (lines 411-417)

**Current code**:
```typescript
const sorted = Array.from(uniqueUsers.values())
  .sort((a, b) => {
    const aPercent = a.yearly_goal > 0 ? (a.leads_closed || 0) / a.yearly_goal : 0;
    const bPercent = b.yearly_goal > 0 ? (b.leads_closed || 0) / b.yearly_goal : 0;
    if (bPercent !== aPercent) return bPercent - aPercent;
    return (b.leads_closed || 0) - (a.leads_closed || 0);
  })
```

**Fixed code**:
```typescript
const sorted = Array.from(uniqueUsers.values())
  .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0))
```

---

### Part 2: Update YTD Leaderboard Tables to Use Rank-Based Colors

Both `LeaderboardTable.tsx` and `CanvasserLeaderboardTable.tsx` currently use goal-based coloring. Change them to use rank-based coloring (matching the weekly tables).

**Files**:
- `src/components/dashboard/LeaderboardTable.tsx`
- `src/components/dashboard/CanvasserLeaderboardTable.tsx`

**Changes**:

Replace the goal-based `getRowColor` function with rank-based:

```typescript
// Get row background color based on rank (matching weekly tables)
const getRowColor = (rank: number) => {
  if (rank === 1) return 'bg-emerald-500 text-white';
  if (rank === 2) return 'bg-green-400 text-green-950';
  if (rank === 3) return 'bg-yellow-300 text-yellow-950';
  if (rank <= 5) return 'bg-orange-300 text-orange-950';
  return 'bg-card text-card-foreground';
};
```

Update the row rendering to use `entry.rank` instead of percentage.

---

### Part 3: Fix Canvasser YTD Table Display for No-Goal Users

**File**: `src/components/dashboard/CanvasserLeaderboardTable.tsx`

When there's no goal set, the "Place" column incorrectly shows 0 and "No Goal" badge. The rank is actually calculated correctly from the entry, but display is confusing.

**Changes**:
1. Always show the proper rank number or trophy (the rank comes from the sorted array)
2. Simplify the "% of Goal" display - show dash when no goal instead of "No Goal" badge for cleaner appearance
3. Remove dependency on `hasGoal` for the row color since we're now using rank-based coloring

---

### Part 4: Add Super Admin Role Support

**Current behavior**: 
- "Admin Only" checkbox → User gets ONLY admin role (no sales/canvasser)
- Sales Rep / Canvasser checkboxes → User gets operational roles, preserves existing admin

**Requested behavior**:
- Add an explicit "Admin" checkbox that can be combined WITH Sales/Canvasser
- Allow any combination: Admin only, Admin+Sales, Admin+Canvasser, Admin+Sales+Canvasser, Sales only, Canvasser only, Sales+Canvasser

**File**: `src/components/admin/EditUserRoleModal.tsx`

**UI Changes**:
Replace current structure with:

```
Account Type:
  [✓] Admin (Portal Access)     ← Can be combined with below
  
Operational Roles (optional):
  [✓] Sales Rep
      Rank: [SR1 ▼]
  [✓] Canvasser
      Rank: [C1 ▼]
```

**Logic Changes**:
1. Add `isAdmin` checkbox (separate from Admin-Only concept)
2. If ONLY `isAdmin` is checked → Admin-only user (no metrics)
3. If `isAdmin` + any operational role → Super Admin with metrics
4. If only operational roles → Regular user with metrics

**State Changes**:
```typescript
const [isAdmin, setIsAdmin] = useState(false);     // Has admin portal access
const [isSalesRep, setIsSalesRep] = useState(false); // Has sales role
const [isCanvasser, setIsCanvasser] = useState(false); // Has canvasser role
```

Validation:
- At least one checkbox must be selected
- If only Admin is checked, show note about "Admin-only (no metrics)"
- If Admin + other roles, show note about "Super Admin with full access"

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/AdminLeaderboards.tsx` | Fix canvasser YTD sorting to use points |
| `src/components/dashboard/LeaderboardTable.tsx` | Change to rank-based coloring |
| `src/components/dashboard/CanvasserLeaderboardTable.tsx` | Change to rank-based coloring, fix display |
| `src/components/admin/EditUserRoleModal.tsx` | Restructure to support Admin + Sales/Canvasser combos |
| `supabase/functions/admin-set-user-role/index.ts` | Update logic for super admin role combinations |

---

### Technical Details

**Color Scheme Standardization**:

| Table Type | Timeframe | Color Method |
|------------|-----------|--------------|
| Sales YTD | Yearly | Rank-based (1st=emerald, 2nd=green, 3rd=yellow, 4-5=orange, 6+=neutral) |
| Sales Weekly/Monthly | Weekly/Monthly | Rank-based |
| Canvasser YTD | Yearly | Rank-based |
| Canvasser Weekly/Monthly | Weekly/Monthly | Rank-based |

All leaderboards now use consistent rank-based coloring.

**Super Admin Role Matrix**:

| Admin | Sales | Canvasser | Result |
|-------|-------|-----------|--------|
| ✓ | ✗ | ✗ | Admin-only (no metrics) |
| ✓ | ✓ | ✗ | Admin + Sales Rep |
| ✓ | ✗ | ✓ | Admin + Canvasser |
| ✓ | ✓ | ✓ | Full Super Admin |
| ✗ | ✓ | ✗ | Sales Rep only |
| ✗ | ✗ | ✓ | Canvasser only |
| ✗ | ✓ | ✓ | Dual Role (no admin) |

---

### Expected Results

1. **Canvasser YTD Leaderboard**: Sorted by points in descending order
2. **All YTD Tables**: Use rank-based coloring (1st place = emerald, 2nd = green, etc.)
3. **Canvasser Table Display**: Clean display even when no goal is set
4. **Super Admin Support**: Can now assign Admin + any combination of Sales/Canvasser roles
5. **Consistent Color Scheme**: All leaderboards (weekly, monthly, yearly) use the same rank-based approach
