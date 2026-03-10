

# Role System Audit — Complete Results

## PART 1 — DATABASE AUDIT

### Query 1: Current role values in `user_roles`
| role | user_count |
|------|-----------|
| admin | 6 |
| user | 29 |
| canvasser | 15 |
| supplementer | 1 |
| production | 3 |

### Query 2: `user_metrics` has NO `role_type` column
The `user_metrics` table has no `role` or `role_type` column at all. It stores sales-specific metrics only (sales, points, leads, closed_deals, yearly_goal, sales_rank, etc.). Role is determined entirely by the `user_roles` table.

### Query 3: `user_roles` column definitions
| column_name | data_type | udt_name | is_nullable |
|------------|-----------|----------|-------------|
| id | uuid | uuid | NO |
| user_id | uuid | uuid | NO |
| role | USER-DEFINED | app_role | NO |

### Query 4: `user_metrics` column definitions
No role-related columns. Contains: id, user_id, sales, points, leads, closed_deals, metric_date, yearly_goal, sales_rank, display_name, earnings_ytd, self_generated_deals, self_generated_leads, collections, approved_revenue, canvass_leads, canvass_deals_closed, contest_points, wager_points, internet_leads, internet_leads_closed.

### Query 5: `profiles` column definitions
No role column. Contains: id, full_name, avatar_url, preferred_view, phone, address fields, emergency contact fields, compensation fields, onboarding fields, tour_completed, is_archived, hidden_from_leaderboard, dna_assessment_pending, login_count, birthday, start_date, manager_id, admin_preset_id.

### Query 6: Tables with role/role_type/user_role columns
Only ONE table has a role column in the public schema:
| table_name | column_name | data_type |
|-----------|-------------|-----------|
| user_roles | role | USER-DEFINED |

### Query 7: CHECK constraints
**No CHECK constraints** exist on any public table.

### Query 8: ENUM types related to roles
The `app_role` enum has these values in order:
1. `admin`
2. `user`
3. `canvasser`
4. `supplementer`
5. `production`

---

## PART 2 — FRONTEND AUDIT

### 2.1 Where is role determined after login?

**File: `src/hooks/useAuth.ts`** (lines 5, 34-42, 206-218)

```typescript
type AppRole = 'admin' | 'user' | 'canvasser' | 'supplementer' | 'production';

// Fetches from user_roles table:
const fetchUserRoles = async (userId: string): Promise<AppRole[]> => {
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
  return data?.map(r => r.role as AppRole) || ['user'];
};

// Derived booleans:
const isAdmin = authState.roles.includes('admin');
const hasSalesRole = authState.roles.includes('user') || authState.roles.includes('admin');
const hasCanvasserRole = authState.roles.includes('canvasser');
const hasSupplementerRole = authState.roles.includes('supplementer');
const hasProductionRole = authState.roles.includes('production');
```

Key detail: `hasSalesRole` is true if the user has `'user'` OR `'admin'` in their roles array. This means all admins are treated as having sales access.

### 2.2 All role string comparisons in the codebase

| File | Role strings checked |
|------|---------------------|
| `src/hooks/useAuth.ts` | `'admin'`, `'user'`, `'canvasser'`, `'supplementer'`, `'production'` |
| `src/components/auth/ProtectedRoute.tsx` | Uses boolean flags only (isAdmin, isCanvasser, etc.) |
| `src/components/dashboard/RoleViewToggle.tsx` | Uses boolean flags only |
| `src/components/dashboard/DashboardHeader.tsx` | Uses boolean flags only |
| `src/components/admin/EditUserRoleModal.tsx` | `'admin'`, `'user'`, `'canvasser'`, `'supplementer'`, `'production'` |
| `src/pages/admin/UserRoles.tsx` | `'admin'`, `'user'`, `'canvasser'`, `'supplementer'`, `'production'` |
| `src/pages/dashboard/InviteUsers.tsx` | `'user'` (for invite preset_role), `'sales_rep'` (for manual create UI label only) |
| `src/pages/admin/WeeklyUpdates.tsx` | `r.role === 'user' \|\| r.role === 'admin'` (to identify sales reps) |
| `src/pages/admin/CompanyGoals.tsx` | `r.role === 'user' \|\| r.role === 'admin'` (to identify sales reps) |
| `src/pages/dashboard/Contests.tsx` | `c.target_role === 'user'` (to filter sales rep contests) |
| `supabase/functions/admin-set-user-role/index.ts` | `'user'`, `'canvasser'`, `'admin'`, `'supplementer'`, `'production'` |
| `supabase/functions/create-user/index.ts` | `'admin'`, `'user'`, `'canvasser'`, `'supplementer'`, `'production'` + legacy mapping of `'sales_rep'` → `['user']` |

### 2.3 Dashboard routing

**`src/App.tsx`**: Four portal route groups, each wrapped with `ProtectedRoute`:
- `/dashboard/*` — No specific role requirement (general protected)
- `/canvasser/*` — `requireCanvasser`
- `/supplementer/*` — `requireSupplementer`
- `/production/*` — `requireProduction`
- `/admin/*` — `requireAdmin`

**`src/components/auth/ProtectedRoute.tsx`** handles redirection:
- Canvasser-only (`isCanvasser && !hasSalesRole`) → redirected from `/dashboard` to `/canvasser`
- Supplementer-only → redirected to `/supplementer`
- Production-only → redirected to `/production`
- Multi-role users (`isDualRole`) → allowed everywhere, use RoleViewToggle to switch

### 2.4 How the production role works

**`src/hooks/useAuth.ts` line 211:**
```typescript
const hasProductionRole = authState.roles.includes('production');
```
Reads from `user_roles` table where `role = 'production'` (part of the `app_role` enum). Production-only detection:
```typescript
const isProductionOnly = hasProductionRole && !hasSalesRole && !hasCanvasserRole && !hasSupplementerRole && !isAdmin;
```

### 2.5 Every instance where `role === 'user'` means "sales rep"

| File | Line | Context |
|------|------|---------|
| `src/hooks/useAuth.ts:208` | `hasSalesRole = roles.includes('user') \|\| roles.includes('admin')` | Core definition |
| `src/hooks/useAuth.ts:218` | `const role = ... : 'user'` | Legacy fallback role string |
| `src/pages/admin/WeeklyUpdates.tsx:152` | `r.role === 'user' \|\| r.role === 'admin'` | Filter sales reps |
| `src/pages/admin/CompanyGoals.tsx:197` | `r.role === 'user' \|\| r.role === 'admin'` | Filter sales rep IDs |
| `src/pages/dashboard/Contests.tsx:744` | `c.target_role === 'user'` | Sales rep contest filter |
| `src/pages/dashboard/InviteUsers.tsx:124-126` | `inviteRole === 'user'` | Conditionally show sales rank/goal |
| `src/components/admin/EditUserRoleModal.tsx:59` | `user.roles.includes('user')` | Checkbox init |
| `src/components/admin/EditUserRoleModal.tsx:88` | `roles.push('user')` | Build roles array |
| `supabase/functions/admin-set-user-role/index.ts:173` | `hasSalesRole = rolesToSet.includes('user')` | Metrics creation |
| `supabase/functions/create-user/index.ts` | Maps `'sales_rep'` → `['user']` | Legacy mapping |

### 2.6 EditUserRoleModal role options

Checkboxes (not a dropdown) — each independently toggleable:
- Admin (Portal Access)
- Sales Rep (labeled "Sales Rep" in UI, stored as `'user'` in DB)
- Canvasser
- Supplementer
- Production

### 2.7 InviteUsers role assignment

**Invite flow**: Dropdown with options `'user'`, `'canvasser'`, `'supplementer'`, `'production'`. The value `'user'` is stored as `preset_role` on the invitation and used when the user signs up.

**Manual create flow**: Dropdown with options `'admin_only'`, `'sales_rep'`, `'canvasser'`, `'supplementer'`, `'production'`, `'super_admin'`. These are UI labels — `create-user` edge function maps `'sales_rep'` → `roles: ['user']`, `'super_admin'` → `roles: ['admin', 'user', 'canvasser']`.

---

## PART 3 — SUMMARY ANSWERS

### Is `user_roles.role = 'user'` the de facto "sales rep" role?

**Yes.** The database enum value `'user'` is the sales rep role. The frontend translates this everywhere:
- `hasSalesRole = roles.includes('user')` in useAuth
- UI labels say "Sales Rep" but store/read `'user'`
- The `create-user` function maps the UI label `'sales_rep'` to the DB value `'user'`

### Are `user_roles` and `user_metrics` mutually exclusive?

**No — they overlap.** Every user in the sample has `has_metrics: true` regardless of role. The `user_metrics` table stores sales-specific metrics and has no role column. Users with canvasser-only roles still have `user_metrics` rows (likely initialized by the create-user function). The `canvasser_metrics` table stores canvasser-specific metrics separately.

### If renaming `'user'` → `'sales_rep'` everywhere — complete change list:

**Database:**
1. Alter `app_role` enum: add `'sales_rep'`, migrate all `'user'` rows, remove `'user'`
2. Update `invitations.preset_role` default and existing values
3. Update `contests.target_role` existing values where `= 'user'`
4. Update all RLS policies referencing `'user'::app_role` (currently none found — all RLS uses `'admin'`)
5. Update `has_role()` function if it references `'user'` anywhere
6. Update `handle_new_user` trigger

**Frontend files:**
1. `src/hooks/useAuth.ts` — type definition, `includes('user')`, legacy role fallback
2. `src/components/admin/EditUserRoleModal.tsx` — includes checks, roles.push
3. `src/pages/admin/UserRoles.tsx` — type definitions
4. `src/pages/dashboard/InviteUsers.tsx` — preset_role values, conditionals
5. `src/pages/admin/WeeklyUpdates.tsx` — role filter
6. `src/pages/admin/CompanyGoals.tsx` — role filter
7. `src/pages/dashboard/Contests.tsx` — target_role filter
8. `src/pages/Auth.tsx` — (uses boolean flags, no direct string — safe)

**Edge functions:**
1. `supabase/functions/admin-set-user-role/index.ts` — validRoles array, hasSalesRole check
2. `supabase/functions/create-user/index.ts` — role mapping logic

### Does the production role live in `user_roles`?

**Yes.** `production` is a value in the `app_role` enum and stored in `user_roles.role`. Currently 3 users have it. It follows the same pattern as all other roles.

