
## Plan: Add Dual Role Selection and Admin-Only Role Support

### Problems Identified

1. **Database blocking dual roles**: The `user_roles` table has a unique index `user_roles_user_id_unique` on `user_id` alone, which prevents a user from having both "user" (Sales Rep) and "canvasser" roles simultaneously.

2. **EditUserRoleModal uses single dropdown**: Currently only allows selecting ONE role (Sales Rep OR Canvasser), not both.

3. **No "Admin Only" option**: Need to add an option to set a user as just an Admin (with admin portal + sales access, but not also having sales rep role visible in role management).

4. **UserRoles.tsx shows single role badge**: Needs to display multiple role badges for dual-role users.

---

### Solution Overview

**User Answers Summary:**
- Admin users can access Admin Portal + Sales Dashboard (not blocked from sales)
- Regular users CAN have both Sales Rep and Canvasser roles (dual role enabled)
- Only existing full Admins can assign/change roles

---

### Part 1: Database Migration

Remove the blocking constraint that prevents dual roles:

```sql
-- Drop the single-column unique constraint on user_id
-- This allows users to have multiple role entries (e.g., both 'user' and 'canvasser')
DROP INDEX IF EXISTS user_roles_user_id_unique;
```

The composite unique index `user_roles_user_id_role_key` already exists and will prevent duplicate same-role entries while allowing multiple different roles per user.

---

### Part 2: Update EditUserRoleModal with Checkboxes

**File: `src/components/admin/EditUserRoleModal.tsx`**

Change from single-select dropdown to checkboxes:

| Current | New |
|---------|-----|
| Single dropdown (Sales Rep / Canvasser) | Checkboxes for both roles |
| One rank dropdown | Conditional rank dropdowns per selected role |

**New UI Structure:**
```
Roles (select one or both):
  [✓] Sales Rep
      Rank: [SR1 ▼]
  [ ] Canvasser
      Rank: [C1 ▼]
```

**State Changes:**
- Replace `role: 'user' | 'canvasser'` with `isSalesRep: boolean` and `isCanvasser: boolean`
- Add validation: at least one role must be selected
- Track separate ranks: `salesRank` and `canvasserRank`

---

### Part 3: Update admin-set-user-role Edge Function

**File: `supabase/functions/admin-set-user-role/index.ts`**

Modify to handle multiple roles:

**Current:** Accepts `newRole: string` (single role)
**New:** Accepts `roles: string[]` (array of roles)

**Logic:**
1. Delete all existing non-admin roles for the user
2. Insert new role entries for each selected role
3. Create/update metrics for each role type (sales metrics if Sales Rep, canvasser metrics if Canvasser)

```typescript
// Accept array of roles
const { targetUserId, roles, salesRank, canvasserRank } = await req.json();

// Validate at least one role
if (!roles || roles.length === 0) {
  return error("At least one role is required");
}

// Delete existing non-admin roles
await supabaseAdmin.from('user_roles')
  .delete()
  .eq('user_id', targetUserId)
  .neq('role', 'admin');

// Insert new roles
for (const role of roles) {
  await supabaseAdmin.from('user_roles')
    .insert({ user_id: targetUserId, role });
}

// Create/update metrics based on roles...
```

---

### Part 4: Update UserRoles.tsx to Display Multiple Roles

**File: `src/pages/admin/UserRoles.tsx`**

**Changes:**
1. Modify `fetchUsers()` to aggregate multiple roles per user
2. Update `UserWithRole` interface: change `role` to `roles: string[]`
3. Display multiple badges when user has dual roles
4. Update sorting logic to handle arrays

**Updated Interface:**
```typescript
interface UserWithRole {
  id: string;
  email: string | null;
  fullName: string | null;
  roles: ('admin' | 'user' | 'canvasser')[];  // Changed from single role
  salesRank: string | null;
  canvasserRank: string | null;
  isArchived: boolean;
  archivedAt: string | null;
}
```

**Badge Display:**
```
Jonathan | [Admin] | —
Dustin | [Sales Rep] [Canvasser] | SR1, C1
Rob | [Sales Rep] | SR2
```

---

### Part 5: Update Auth Redirect Logic

**File: `src/pages/Auth.tsx`**

Currently redirects admins to `/admin`. Needs to check for admin-only vs admin+sales:

**Current logic (line 52-57):**
```typescript
if (isCanvasser) {
  targetRoute = '/canvasser';
} else if (isAdmin) {
  targetRoute = '/admin';
}
```

**Updated logic:**
```typescript
if (isAdmin) {
  // Admin users go to admin portal by default
  targetRoute = '/admin';
} else if (isCanvasser && !hasSalesRole) {
  // Canvasser-only users go to canvasser portal
  targetRoute = '/canvasser';
} else {
  // Sales rep (with or without canvasser) goes to dashboard
  targetRoute = '/dashboard';
}
```

This ensures:
- Admin-only users → Admin Portal
- Admin + Sales users → Admin Portal (can navigate to dashboard)
- Canvasser-only → Canvasser Portal
- Sales-only → Dashboard
- Dual role (Sales + Canvasser) → Dashboard (can toggle to canvasser)

---

### Files to Modify

| File | Changes |
|------|---------|
| **Database Migration** | Drop `user_roles_user_id_unique` index |
| `src/components/admin/EditUserRoleModal.tsx` | Add checkboxes for dual role selection with conditional rank dropdowns |
| `supabase/functions/admin-set-user-role/index.ts` | Accept `roles[]` array, delete/insert multiple roles |
| `src/pages/admin/UserRoles.tsx` | Aggregate multiple roles per user, display multiple badges |
| `src/pages/Auth.tsx` | Update redirect logic for admin-only vs admin+sales |

---

### Expected Results

After implementation:

1. **Database**: Users can have multiple role entries (e.g., both `user` and `canvasser`)

2. **Edit User Modal**: Shows checkboxes allowing selection of one or both roles:
   - Sales Rep checkbox with rank dropdown
   - Canvasser checkbox with rank dropdown

3. **User Roles Table**: Displays multiple badges for dual-role users

4. **Login Routing**:
   - Admins → Admin Portal
   - Canvasser-only → Canvasser Portal
   - Sales Rep → Dashboard
   - Dual role → Dashboard with toggle

5. **Role Toggle**: The previously implemented `RoleViewToggle` component will work for dual-role users to switch between portals
