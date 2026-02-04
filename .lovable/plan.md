
## Implementation Plan: Fix User Creation, Rename Labels, and Add Role Types

Based on my investigation, I will implement the following changes:

---

### 1. Database Migration - Fix `handle_new_user()` Trigger

**Root Cause**: The trigger uses `ON CONFLICT (user_id)` but the unique constraint on `user_id` was removed to allow multiple roles per user. This causes the "Database error creating new user" when creating users.

**Solution**: Replace `ON CONFLICT (user_id)` with an explicit role count check:
- First check if ANY roles already exist for the user
- Only insert role if none exist (edge functions handle their own role creation)
- This allows the edge function to pre-create roles before the trigger runs

---

### 2. Rename Labels in Admin Overview

**File**: `src/pages/dashboard/AdminOverview.tsx`

| Line | Current | New |
|------|---------|-----|
| 596 | `title="Total Users"` | `title="Total Sales Reps"` |

---

### 3. Rename Tab Label in InviteUsers

**File**: `src/pages/dashboard/InviteUsers.tsx`

| Line | Current | New |
|------|---------|-----|
| 391 | `Create User` | `Create Account` |
| 596 | `Create User Account` | `Create Account` |
| 689 | `Create User` button | `Create Account` button |

---

### 4. Add 4 Role Types in InviteUsers

**Current role options**: User (Sales Rep), Canvasser, Admin

**New role options**:
| Value | Label | Roles Created | Metrics |
|-------|-------|---------------|---------|
| `admin_only` | Admin Only | `admin` | None |
| `sales_rep` | Sales Rep | `user` | user_metrics |
| `canvasser` | Canvasser | `canvasser` | canvasser_metrics |
| `super_admin` | Super Admin (All Roles) | `admin`, `user`, `canvasser` | Both |

**UI Changes**:
- Update state type to `'admin_only' | 'sales_rep' | 'canvasser' | 'super_admin'`
- Add new canvasser rank state for manual creation
- Show/hide rank fields based on selected role:
  - **Admin Only**: No rank fields
  - **Sales Rep**: Sales rank + yearly goal
  - **Canvasser**: Canvasser rank only
  - **Super Admin**: Sales rank + canvasser rank + yearly goal

---

### 5. Update create-user Edge Function

**File**: `supabase/functions/create-user/index.ts`

Handle `roleType` parameter with 4 options:

```text
roleType → Roles Created → Metrics Created
─────────────────────────────────────────────
admin_only  → [admin]                    → none
sales_rep   → [user]                     → user_metrics
canvasser   → [canvasser]                → canvasser_metrics  
super_admin → [admin, user, canvasser]   → user_metrics + canvasser_metrics
```

Also accept `canvasserRank` parameter for Canvasser and Super Admin roles.

---

### Files to be Modified

| File | Changes |
|------|---------|
| **New Migration** | Update `handle_new_user()` function |
| `src/pages/dashboard/AdminOverview.tsx` | Rename "Total Users" → "Total Sales Reps" |
| `src/pages/dashboard/InviteUsers.tsx` | Rename tabs, add 4 role types, conditional rank fields |
| `supabase/functions/create-user/index.ts` | Handle roleType param with 4 options |

---

### Expected Results

1. ✅ **User creation works** - S.elliott@oknextgen.com can be created successfully
2. ✅ **"Total Users" renamed** to "Total Sales Reps" in Admin Overview
3. ✅ **Tab renamed** to "Create Account" 
4. ✅ **4 role types available**:
   - Admin Only: Admin portal only, no metrics (not on leaderboards)
   - Sales Rep: Sales dashboard with sales metrics
   - Canvasser: Canvasser portal with canvasser metrics
   - Super Admin: All portals with both metrics types
