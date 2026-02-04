
## Plan: Fix Multi-Role User Display & Add "Hide from Leaderboard" Feature

### Issue 1: Adam Coury Not Showing in Sales Rep Overview

**Root Cause Confirmed:**
Adam Coury has THREE roles in the database: `admin`, `user`, `canvasser`. The current code in `AdminOverview.tsx` lines 249-252 uses a simple `Map.set()` which overwrites values:

```typescript
const rolesMap = new Map<string, 'admin' | 'user' | 'canvasser'>();
rolesData?.forEach((r) => {
  rolesMap.set(r.user_id, r.role as 'admin' | 'user' | 'canvasser');
});
```

When iterating through Adam's roles (`admin`, `user`, `canvasser`), the LAST one (`canvasser`) becomes his assigned role. Then on line 287:
```typescript
const salesReps = users.filter(user => user.role !== 'canvasser');
```
Adam gets filtered OUT because his role is `canvasser`.

**Solution:**
Use role priority logic: `admin` > `user` > `canvasser`. If a user has the `user` role (Sales Rep), they should appear in the Sales Rep table regardless of other roles.

---

### Issue 2: Add "Hide from Leaderboard" Feature

**Implementation Approach:**

1. **Database Change**: Add a `hidden_from_leaderboard` boolean column to the `profiles` table
2. **Admin UI**: Add a toggle in the User Roles management page to hide/show users from leaderboards
3. **Filter Logic**: Update all leaderboard queries to exclude users where `hidden_from_leaderboard = true`

---

### Technical Implementation

**Part A: Fix Multi-Role Handling in AdminOverview.tsx**

Update lines 249-252 to use role priority:

```typescript
const rolesMap = new Map<string, 'admin' | 'user' | 'canvasser'>();
const rolePriority = { admin: 3, user: 2, canvasser: 1 };

rolesData?.forEach((r) => {
  const currentRole = rolesMap.get(r.user_id);
  const newRole = r.role as 'admin' | 'user' | 'canvasser';
  
  // Only update if no role exists OR new role has higher priority
  if (!currentRole || rolePriority[newRole] > rolePriority[currentRole]) {
    rolesMap.set(r.user_id, newRole);
  }
});
```

This ensures:
- Adam (with `admin`, `user`, `canvasser`) gets assigned `admin` role (highest priority)
- Users with `user` + `canvasser` get assigned `user` role
- Users with ONLY `canvasser` get assigned `canvasser` and appear in the Canvasser tab

**Part B: Database Migration - Add `hidden_from_leaderboard` Column**

```sql
-- Add hidden_from_leaderboard column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hidden_from_leaderboard boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.hidden_from_leaderboard IS 'When true, user stats are excluded from all leaderboard displays';
```

**Part C: Update User Roles Management UI**

Add a toggle switch in `src/components/admin/EditUserRoleModal.tsx`:

- Add state for `hiddenFromLeaderboard`
- Add a Switch component with label "Hide from Leaderboards"
- Update the edge function call to save this setting
- The toggle should be visible for all users with operational roles (Sales Rep or Canvasser)

**Part D: Update Edge Function**

Update `admin-set-user-role` to accept and save `hiddenFromLeaderboard`:

```typescript
// Add to request body handling
const hiddenFromLeaderboard = body.hiddenFromLeaderboard ?? false;

// Update profiles table
await supabaseClient
  .from('profiles')
  .update({ hidden_from_leaderboard: hiddenFromLeaderboard })
  .eq('id', targetUserId);
```

**Part E: Update Leaderboard Queries**

Filter out hidden users in these files:

| File | Change Required |
|------|-----------------|
| `src/pages/dashboard/Leaderboard.tsx` | Join with profiles to filter `hidden_from_leaderboard = false` |
| `src/pages/admin/AdminLeaderboards.tsx` | Join with profiles to filter `hidden_from_leaderboard = false` |
| `src/pages/dashboard/AdminOverview.tsx` | Filter based on profiles `hidden_from_leaderboard` status |

Example query update for YTD leaderboard:
```typescript
// Fetch profiles with hidden status
const { data: profilesData } = await supabase
  .from('profiles')
  .select('id, full_name, hidden_from_leaderboard')
  .in('id', userIds);

// Filter out hidden users
const visibleUserIds = profilesData
  ?.filter(p => !p.hidden_from_leaderboard)
  .map(p => p.id) || [];

// Apply filter to leaderboard entries
const visibleEntries = entries.filter(e => visibleUserIds.includes(e.userId));
```

---

### Files to be Modified

| File | Changes |
|------|---------|
| `src/pages/dashboard/AdminOverview.tsx` | Fix role priority logic (lines 249-252) |
| `src/components/admin/EditUserRoleModal.tsx` | Add "Hide from Leaderboard" toggle |
| `src/pages/admin/UserRoles.tsx` | Display hidden status indicator + pass to modal |
| `supabase/functions/admin-set-user-role/index.ts` | Handle `hiddenFromLeaderboard` parameter |
| `src/pages/dashboard/Leaderboard.tsx` | Filter out hidden users from all leaderboard views |
| `src/pages/admin/AdminLeaderboards.tsx` | Filter out hidden users from admin leaderboard views |

**Database Migration:**
- Add `hidden_from_leaderboard` boolean column to `profiles` table

---

### Summary of Changes

**Bug Fix:**
- Multi-role users (like Adam with Sales Rep + Canvasser) will now appear in the Sales Rep Overview based on role priority
- Priority order: `admin` > `user` > `canvasser`

**New Feature: Hide from Leaderboard**
- Admins can toggle users on/off from appearing in leaderboards
- Hidden users' stats are still tracked but not displayed publicly
- Toggle is available in the Edit User Role modal
- Applies to: YTD, Weekly, and Monthly leaderboards for both Sales Reps and Canvassers

---

### Expected Results

1. **Adam Coury appears in Sales Rep Overview** with his correct contract count (1)
2. **New toggle in User Roles** to hide users from leaderboards
3. **Hidden users excluded** from all leaderboard displays but their data remains tracked
4. **Admin Overview still shows all users** for management purposes (only public leaderboards are filtered)
