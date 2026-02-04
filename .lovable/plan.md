
## Plan: Fix Dual-Role Switching, Admin-Only Role, and Leaderboard Issues

### Summary of Issues to Fix

Based on my investigation, there are 5 distinct issues:

1. **Dual-role goal error** - When switching from Canvasser to Sales view, saving goals fails with "Canvassers cannot have sales user metrics"
2. **52-week tracker not showing** - Related to the same validation trigger blocking dual-role users
3. **No Admin-only role option** - Currently cannot set a user as Admin-only (no sales profile)
4. **YTD Point rankings not working in Canvasser Dashboard** - The canvasser YTD leaderboard exists but may not be visible in the stats page
5. **Leaderboard color scheme mismatch** - Weekly leaderboards use rank-based colors while YTD uses goal-based colors

---

### Root Cause Analysis

#### Issue 1 & 2: Database Trigger Blocking Dual-Role Users

The `validate_user_metrics()` trigger (in migration file) blocks ALL users who have a 'canvasser' role from accessing user_metrics:

```sql
IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'canvasser') THEN
  -- Allow if admin is inserting
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Canvassers cannot have sales user metrics';
END IF;
```

This doesn't account for users who have BOTH the 'user' and 'canvasser' roles. It only allows admins to bypass the check.

**Fix**: Update the trigger to also allow users who have the 'user' role (even if they also have 'canvasser').

---

#### Issue 3: No Admin-Only Role Option

Currently, the `EditUserRoleModal` only allows selecting Sales Rep and/or Canvasser. There's no way to set someone as Admin-only without a sales/canvasser profile.

**Fix**: 
1. Add an "Admin Only" option to the modal
2. Update the edge function to handle admin-only role assignment
3. Ensure admin-only users don't get redirected to sales dashboard

---

#### Issue 4: Canvasser YTD Leaderboard in Stats Page

Looking at `CanvasserStats.tsx`, there's no YTD Point rankings section displayed. The leaderboard exists at `/canvasser/leaderboard` but users want to see their ranking directly on the stats page.

**Fix**: Add a mini-leaderboard widget showing the user's current YTD ranking and top 3 canvassers on the CanvasserStats page.

---

#### Issue 5: Leaderboard Color Scheme Inconsistency

| Table | Color Logic |
|-------|-------------|
| `LeaderboardTable` (Sales YTD) | Based on % of goal |
| `CanvasserLeaderboardTable` (Canvasser YTD) | Based on % of goal |
| `WeeklyLeaderboardTable` (Sales Weekly/Monthly) | Based on rank (1st=green, 2nd=light green...) |
| `WeeklyCanvasserLeaderboardTable` (Canvasser Weekly/Monthly) | Based on rank |

The YTD tables use goal-based colors while weekly/monthly use rank-based colors. This is inconsistent.

**Fix**: Standardize weekly/monthly tables to use the same approach as YTD tables OR update all to use rank-based colors. Since weekly data doesn't have goals, rank-based is more appropriate for weekly views. The current implementation is actually intentional (YTD shows goal progress, weekly shows weekly performance). But the canvasser YTD table should match the sales YTD approach more closely.

---

### Implementation Plan

#### Part 1: Fix Database Trigger for Dual-Role Users

**Database Migration** to update `validate_user_metrics()`:

```sql
CREATE OR REPLACE FUNCTION public.validate_user_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if user has the 'user' role (sales rep)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'user') THEN
    RETURN NEW;
  END IF;
  
  -- Allow if user is admin (admins can have sales metrics)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin') THEN
    RETURN NEW;
  END IF;
  
  -- Allow if the inserting user is an admin (for admin-created metrics)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN NEW;
  END IF;
  
  -- Block canvasser-only users from having sales metrics
  RAISE EXCEPTION 'User must have sales rep role to access sales metrics';
END;
$$;
```

This allows:
- Users with 'user' role (including dual-role users)
- Admin users
- Entries made by an admin on behalf of others

---

#### Part 2: Add Admin-Only Role Support

**File: `src/components/admin/EditUserRoleModal.tsx`**

Add a third checkbox option for "Admin Only" that:
- When checked, disables both Sales Rep and Canvasser checkboxes
- Sets the user as admin without sales/canvasser roles

**File: `supabase/functions/admin-set-user-role/index.ts`**

Update to accept 'admin' in the roles array and handle admin-only assignment:
- When roles = ['admin'], delete existing user/canvasser roles
- Create admin role entry only
- Do NOT create user_metrics or canvasser_metrics

**File: `src/pages/admin/UserRoles.tsx`**

Update `canEditUser()` to allow editing admin users to toggle their admin-only status.

---

#### Part 3: Add YTD Ranking Widget to Canvasser Stats

**File: `src/pages/canvasser/CanvasserStats.tsx`**

Add a new collapsible section "YTD Ranking" that shows:
- Current user's rank and points
- Top 3 canvassers
- Link to full leaderboard

This fetches data from `canvasser_metrics` sorted by points.

---

#### Part 4: Standardize Leaderboard Color Scheme

Both `CanvasserLeaderboardTable.tsx` and `LeaderboardTable.tsx` use goal-based coloring (emerald for 100%+, green for 75%+, etc.).

The weekly tables use rank-based coloring (1st place = green, 2nd = lighter green, etc.).

**Decision**: Keep the current approach (goal-based for YTD, rank-based for weekly) as it makes contextual sense:
- YTD: Shows progress toward annual goal
- Weekly: Shows relative weekly performance

However, the Canvasser YTD table needs a slight fix - when there's no goal set, it falls back to `bg-card` which may not match the rest. I'll ensure "No Goal" users still get a neutral background that fits the theme.

The color schemes ARE already matching between sales and canvasser for the same timeframe type.

---

### Files to be Modified

| File | Changes |
|------|---------|
| **Database Migration** | Update `validate_user_metrics()` function to allow dual-role users |
| `src/components/admin/EditUserRoleModal.tsx` | Add "Admin Only" checkbox option |
| `supabase/functions/admin-set-user-role/index.ts` | Support 'admin' in roles array for admin-only assignment |
| `src/pages/admin/UserRoles.tsx` | Allow editing admin users to toggle admin status |
| `src/pages/canvasser/CanvasserStats.tsx` | Add YTD Ranking collapsible widget |
| `src/pages/Auth.tsx` | Already correct - admins go to /admin |
| `src/hooks/useAuth.ts` | No changes needed - already handles multiple roles |

---

### Expected Results After Implementation

1. **Dual-role users can switch views** and save goals in both Sales and Canvasser settings without errors
2. **52-week tracker loads** for dual-role users viewing sales metrics
3. **Admin-only users** can be created via User Roles - they won't have sales/canvasser metrics
4. **Canvasser Stats page** shows YTD ranking widget with current position and top 3
5. **Color schemes** remain consistent (YTD = goal-based, Weekly = rank-based)

---

### Technical Details

**Trigger Logic Change**:
- OLD: Block if user has 'canvasser' role (regardless of other roles)
- NEW: Allow if user has 'user' OR 'admin' role, block only pure canvasser-only users

**Admin-Only Flow**:
1. Admin selects "Admin Only" checkbox in Edit modal
2. Modal disables Sales Rep and Canvasser checkboxes
3. Edge function receives roles = ['admin']
4. Edge function deletes 'user' and 'canvasser' roles, inserts 'admin'
5. No metrics are created
6. User logs in and is redirected to /admin
