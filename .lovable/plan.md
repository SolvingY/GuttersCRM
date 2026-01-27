

## Plan: Add User Archiving, Permanent Deletion, and Canvasser Ranks

### Overview

This plan adds three major features to the User Roles section of the admin dashboard:

1. **Archive Users** - Remove users from active dashboard views while keeping their metrics in calculations. Archived users are also prevented from logging in.
2. **Permanently Delete Users** - Completely remove users from the system including auth account and all associated data.
3. **Canvasser Ranks** - Add C1, C2, C3 ranking system for canvassers, similar to how SR1-SR6 works for sales reps.

---

### Part 1: Database Schema Changes

#### 1.1 Add Archive Status to Profiles Table

```sql
-- Add is_archived column to profiles table
ALTER TABLE public.profiles
ADD COLUMN is_archived boolean DEFAULT false,
ADD COLUMN archived_at timestamp with time zone DEFAULT null,
ADD COLUMN archived_by uuid DEFAULT null;
```

#### 1.2 Add Canvasser Rank to Canvasser Metrics Table

```sql
-- Add canvasser_rank column to canvasser_metrics table
ALTER TABLE public.canvasser_metrics
ADD COLUMN canvasser_rank text DEFAULT 'C1';

-- Add canvasser_rank to weekly_canvasser_metrics for historical tracking
ALTER TABLE public.weekly_canvasser_metrics
ADD COLUMN canvasser_rank text DEFAULT 'C1';
```

---

### Part 2: Update Constants File

#### File: `src/lib/constants.ts`

Add canvasser rank options:

```typescript
// Sales Rank Options (existing)
export const RANK_OPTIONS = ['SR1', 'SR2', 'SR3', 'SR4', 'SR5', 'SR6', 'Y?', 'CEO', 'GM'];

// Canvasser Rank Options (new)
export const CANVASSER_RANK_OPTIONS = ['C1', 'C2', 'C3'];
```

---

### Part 3: Create/Update Edge Functions

#### 3.1 Create New Edge Function: `admin-manage-user`

**File: `supabase/functions/admin-manage-user/index.ts`**

A new edge function to handle archiving, unarchiving, and permanent deletion:

**Actions supported:**
- `archive` - Sets `is_archived = true`, `archived_at`, `archived_by` and bans the user from logging in using Supabase's `ban_duration` feature
- `unarchive` - Sets `is_archived = false` and lifts the login ban
- `delete` - Permanently removes the user from:
  - `auth.users` (via `auth.admin.deleteUser()`)
  - All associated data is cascade-deleted due to foreign keys

**Security:**
- Requires admin role (verified server-side)
- Cannot archive/delete admins
- Uses service role key for auth admin operations

```typescript
// Pseudocode structure:
1. Verify caller is admin
2. Parse action (archive/unarchive/delete) and targetUserId
3. For archive:
   - Update profiles.is_archived = true
   - Use auth.admin.updateUserById() with ban_duration: '876000h' (100 years)
4. For unarchive:
   - Update profiles.is_archived = false  
   - Use auth.admin.updateUserById() with ban_duration: 'none'
5. For delete:
   - Call auth.admin.deleteUser() - cascade deletes all related data
```

#### 3.2 Update Existing Edge Function: `admin-set-user-role`

**File: `supabase/functions/admin-set-user-role/index.ts`**

Add support for updating canvasser rank when role is canvasser:

```typescript
// Add new parameter: canvasserRank
const { targetUserId, newRole, canvasserRank } = await req.json();

// When updating canvasser metrics, also update the rank
if (newRole === 'canvasser' && canvasserRank) {
  await adminClient.from('canvasser_metrics')
    .update({ canvasser_rank: canvasserRank })
    .eq('user_id', targetUserId);
}
```

---

### Part 4: Update User Roles Page

#### File: `src/pages/admin/UserRoles.tsx`

Complete redesign of the User Roles management page:

**New UI Structure:**
```
+--------------------------------------------------+
|  User Roles Management                            |
|  Manage user roles, ranks, and account status     |
+--------------------------------------------------+
|  [Active Users] [Archived Users]                  |  <- Tab toggle
+--------------------------------------------------+
| Name | Role | Rank | Status | Actions            |
|------|------|------|--------|-------------------|
| John | Sales Rep | SR3 | Active | [Edit] [Archive] [Delete] |
| Jane | Canvasser | C2  | Active | [Edit] [Archive] [Delete] |
| Admin| Admin     | -   | Active | [Copy ID]                 |
+--------------------------------------------------+
```

**Features:**

1. **Tabs**: Toggle between Active and Archived users
2. **Role Column**: Show current role with badge styling
3. **Rank Column**: 
   - For Sales Reps: Show SR1-SR6, Y?, CEO, GM
   - For Canvassers: Show C1, C2, C3
4. **Actions Column**:
   - **Edit Button** - Opens modal to change role and rank
   - **Archive Button** - Confirmation dialog then archives (hidden for admins)
   - **Delete Button** - Confirmation dialog with warning then permanently deletes (hidden for admins)
   - **Unarchive Button** - Only shown in Archived tab

**New Interface:**
```typescript
interface UserWithRole {
  id: string;
  fullName: string | null;
  role: 'admin' | 'user' | 'canvasser';
  rank: string | null; // SR1-SR6 or C1-C3
  isArchived: boolean;
  archivedAt: string | null;
}
```

**New State:**
```typescript
const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [targetUser, setTargetUser] = useState<UserWithRole | null>(null);
```

**Data Fetching Updates:**
```typescript
// Fetch profiles with archive status
const { data: profilesData } = await supabase
  .from('profiles')
  .select('id, full_name, is_archived, archived_at');

// Fetch user_metrics for sales rep ranks
const { data: userMetricsData } = await supabase
  .from('user_metrics')
  .select('user_id, sales_rank');

// Fetch canvasser_metrics for canvasser ranks
const { data: canvasserMetricsData } = await supabase
  .from('canvasser_metrics')
  .select('user_id, canvasser_rank');
```

---

### Part 5: Create Edit User Modal Component

#### New File: `src/components/admin/EditUserRoleModal.tsx`

A modal for editing user role and rank:

**Features:**
- Role dropdown (Sales Rep / Canvasser) - cannot change for admins
- Rank dropdown (conditional based on role):
  - If Sales Rep: SR1-SR6, Y?, CEO, GM
  - If Canvasser: C1, C2, C3
- Save button calls the updated `admin-set-user-role` edge function

**Props:**
```typescript
interface EditUserRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}
```

---

### Part 6: Update Dashboard Queries to Filter Archived Users

Several components need to filter out archived users from active views:

#### 6.1 Admin Overview - `src/pages/dashboard/AdminOverview.tsx`

**Changes:**
- Join profiles table to check `is_archived`
- Filter out archived users from display
- Keep archived user metrics in aggregate calculations (their historical data counts)

```typescript
// Fetch active user IDs
const { data: activeProfiles } = await supabase
  .from('profiles')
  .select('id')
  .eq('is_archived', false);

const activeUserIds = new Set(activeProfiles?.map(p => p.id) || []);

// In display: filter to only show active users
const displayUsers = userDetails.filter(u => 
  u.realUserId && activeUserIds.has(u.realUserId)
);
```

**Note:** Aggregate totals should still include archived user data for accurate historical reporting.

#### 6.2 Weekly Updates - `src/pages/admin/WeeklyUpdates.tsx`

- Only show active users in the data entry forms
- Archived users should not appear in the weekly update form

#### 6.3 Leaderboards - `src/pages/admin/AdminLeaderboards.tsx` and others

- Filter archived users from leaderboard displays
- Their historical weekly data remains in the database

---

### Part 7: Update Canvasser Components for Rank Display

#### 7.1 Canvasser Stats - `src/pages/canvasser/CanvasserStats.tsx`

Add rank display in the header/stats area.

#### 7.2 Edit Canvasser Metrics Modal - `src/components/dashboard/EditCanvasserMetricsModal.tsx`

Add rank selection dropdown using `CANVASSER_RANK_OPTIONS`.

#### 7.3 Canvasser Leaderboard - `src/pages/canvasser/CanvasserLeaderboard.tsx`

Add rank column to leaderboard table.

#### 7.4 Weekly Canvasser Leaderboard Table - `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx`

Add rank column display.

---

### Part 8: Update Invite System for Canvasser Ranks

#### 8.1 Invitations Table Migration

```sql
-- Add preset_canvasser_rank to invitations table
ALTER TABLE public.invitations
ADD COLUMN preset_canvasser_rank text DEFAULT 'C1';
```

#### 8.2 Update Invite Users Page - `src/pages/dashboard/InviteUsers.tsx`

When creating a canvasser invite, allow setting initial rank (C1, C2, C3).

#### 8.3 Update handle_new_user Trigger

Modify the database trigger to set `canvasser_rank` from invitation presets when creating canvasser metrics.

---

### Summary of Changes

| File/Resource | Action | Description |
|---------------|--------|-------------|
| `profiles` table | Migrate | Add `is_archived`, `archived_at`, `archived_by` columns |
| `canvasser_metrics` table | Migrate | Add `canvasser_rank` column |
| `weekly_canvasser_metrics` table | Migrate | Add `canvasser_rank` column |
| `invitations` table | Migrate | Add `preset_canvasser_rank` column |
| `src/lib/constants.ts` | Modify | Add `CANVASSER_RANK_OPTIONS` |
| `supabase/functions/admin-manage-user/index.ts` | Create | New function for archive/unarchive/delete |
| `supabase/functions/admin-set-user-role/index.ts` | Modify | Add canvasser rank support |
| `src/pages/admin/UserRoles.tsx` | Modify | Complete redesign with tabs, archive/delete actions |
| `src/components/admin/EditUserRoleModal.tsx` | Create | New modal for editing role and rank |
| `src/pages/dashboard/AdminOverview.tsx` | Modify | Filter archived users from display |
| `src/pages/admin/WeeklyUpdates.tsx` | Modify | Filter archived users from forms |
| `src/pages/admin/AdminLeaderboards.tsx` | Modify | Filter archived users from leaderboards |
| `src/pages/canvasser/CanvasserStats.tsx` | Modify | Display canvasser rank |
| `src/components/dashboard/EditCanvasserMetricsModal.tsx` | Modify | Add rank selection |
| `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx` | Modify | Add rank column |
| `src/pages/dashboard/InviteUsers.tsx` | Modify | Add canvasser rank preset option |

---

### Technical Implementation Details

**Archive Behavior:**
- Archived users cannot log in (Supabase `ban_duration` set to 100 years)
- Their historical data remains in all metrics tables
- Aggregate calculations (totals, goals) include their contributions
- They are hidden from active user lists and data entry forms
- Admins can view archived users in a separate tab and unarchive them

**Delete Behavior:**
- Removes user from `auth.users` completely
- All related data cascade-deletes due to foreign key constraints
- This action is irreversible - confirmation dialog emphasizes this
- Admins cannot be deleted (protection in edge function and UI)

**Canvasser Rank System:**
- C1, C2, C3 hierarchy mirrors SR1-SR6 for sales reps
- Rank is stored in `canvasser_metrics` table
- Can be set during invite creation or edited later by admin
- Displayed on leaderboards and stats pages

