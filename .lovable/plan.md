

## Fix Archive Error and Exclude Archived Users from Overview/Weekly Updates

### Problem 1: Archive Action Fails (Edge Function Error)
The `admin-manage-user` edge function uses `.single()` when querying `user_roles` to verify the caller is an admin (line 49) and to check the target user's role (line 81). Users with multiple roles (e.g., admin + user + canvasser) return multiple rows, causing the `.single()` call to fail with "The result contains 3 rows".

### Problem 2: Archived Users Appear in Master Overview
The `AdminOverview.tsx` page does not filter out archived users when displaying sales rep and canvasser tables. Archived users should still have their stats included in aggregate totals but should not appear as individual rows.

### Problem 3: Weekly Updates Already Handles This
The `WeeklyUpdates.tsx` page already filters out archived users (lines 104-123). No changes needed there.

---

### Fix 1: Edge Function -- `supabase/functions/admin-manage-user/index.ts`

**Caller admin check (line 45-49):** Replace `.single()` with a query that checks if any of the caller's roles is `admin`:

```
const { data: callerRoles, error: roleError } = await supabaseAdmin
  .from("user_roles")
  .select("role")
  .eq("user_id", user.id);

const isCallerAdmin = callerRoles?.some(r => r.role === "admin");
if (roleError || !isCallerAdmin) { ... }
```

**Target user admin check (line 77-81):** Replace `.single()` with a check across all roles:

```
const { data: targetRoles } = await supabaseAdmin
  .from("user_roles")
  .select("role")
  .eq("user_id", targetUserId);

const isTargetAdmin = targetRoles?.some(r => r.role === "admin");
if (isTargetAdmin) { ... }
```

### Fix 2: Master Overview -- `src/pages/dashboard/AdminOverview.tsx`

**Sales Reps section (around lines 246-313):**
- Fetch profiles with `is_archived` field alongside `full_name`
- Create an `archivedIds` set from profiles where `is_archived === true`
- Split users into two groups: active (shown in table) and all (used for aggregate totals)
- Aggregate totals should still include archived users' stats
- The `userDetails` list (table rows) should exclude archived users

**Canvasser section (around lines 334+):**
- Apply the same archived-user filtering pattern
- Archived canvassers' stats count toward totals but don't appear in the table

### Summary of Changes

| File | Change |
|---|---|
| `supabase/functions/admin-manage-user/index.ts` | Replace two `.single()` calls with multi-row queries that check for admin role |
| `src/pages/dashboard/AdminOverview.tsx` | Fetch `is_archived` from profiles; exclude archived users from table display while keeping their stats in aggregates |

