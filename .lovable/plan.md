

## Fix Login Tracking + Contractor Management UI Improvements

### 1. Fix Login Tracking (Still Showing 0)

**Root Cause**: The `increment_login_count` RPC is confirmed working (function exists, has PUBLIC execute permission, SECURITY DEFINER). The problem is that the user's browser already has the sessionStorage key set from the current session. The fix (date-scoped key) is correct but requires a **fresh browser session** (close and reopen the tab, or clear sessionStorage) for it to take effect.

**Additional Fix**: Add a `console.log` temporarily to confirm the RPC fires, and also add error handling so failures are visible. The current code silently discards errors via `void`. We should also ensure the RPC call isn't silently failing by adding `.then()` error logging.

**Changes to `AdminLayout.tsx`, `DashboardLayout.tsx`, `CanvasserLayout.tsx`:**
- Add error logging to the RPC call so any failures are visible in the console
- The date-scoped key logic is already correct

### 2. Team DNA Intelligence — Default to Collapsed

**File**: `src/pages/admin/ContractorManagement.tsx` (line 281)

Change `<Collapsible defaultOpen>` to `<Collapsible>` (removes `defaultOpen` prop so it starts collapsed).

### 3. New "Quarterly Reviews" Collapsible Section

Add a new collapsible dropdown on the Contractor Management page (Active tab), placed below the Team DNA Intelligence section. This section will show:

- **Average review rating** across all team members (as stars out of 5)
- **Breakdown by quarter** showing how many reviews were done and the average rating per quarter
- **Team member review summary** — each member's latest review rating

**Data source**: The `performance_reviews` table already exists with `user_id`, `quarter`, `overall_rating` (1-5), `review_notes`, `goals_set`, `action_items`, and `review_date`.

**File**: `src/pages/admin/ContractorManagement.tsx`

**Design:**
```
[Collapsible - starts collapsed]
QUARTERLY REVIEWS
Avg Rating: 4.2/5 (stars) -- X reviews total

  [Expanded content:]
  Quarter breakdown grid:
  | Q1 2026 | 3 reviews | Avg 4.3/5 (stars) |
  | Q4 2025 | 5 reviews | Avg 3.8/5 (stars) |
  ...

  Member latest ratings:
  | Name | Latest Quarter | Rating (stars) |
```

---

### Technical Details

**Files to modify:**
| File | Changes |
|---|---|
| `src/pages/admin/AdminLayout.tsx` | Add `.then`/`.catch` logging to RPC call |
| `src/pages/dashboard/DashboardLayout.tsx` | Add `.then`/`.catch` logging to RPC call |
| `src/pages/canvasser/CanvasserLayout.tsx` | Add `.then`/`.catch` logging to RPC call |
| `src/pages/admin/ContractorManagement.tsx` | (1) Remove `defaultOpen` from DNA Collapsible, (2) Add new Quarterly Reviews collapsible section with review data query and summary UI |

**New query in ContractorManagement.tsx:**
```typescript
const { data: allReviews = [] } = useQuery({
  queryKey: ["cm-all-reviews"],
  queryFn: async () => {
    const { data } = await supabase
      .from("performance_reviews")
      .select("*")
      .order("review_date", { ascending: false });
    return (data ?? []) as any[];
  },
});
```

**Computed stats:**
- Overall average rating across all reviews
- Group by quarter, count reviews per quarter, average rating per quarter
- Map each user to their most recent review rating

No database changes needed.

