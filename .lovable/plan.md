

## Plan: Multiple Fixes and Dual Role Support

### Overview

This plan addresses the following issues:

1. **Fix Lead-to-Close Calculation** - Use canvasser Leads Set vs Leads Closed for the ratio
2. **Fix Company Overview Metrics** - Correct the "Sales to Lead Close Ratio" to use canvasser data
3. **Rename "Not Interested" to "Canceled Lead"** - Across all UI components
4. **Fix Leaderboard Ranking** - Ensure correct ranking by points on canvasser leaderboard
5. **Change Goal Label** - "Contracts Signed From Leads" as the goal terminology
6. **Add Password Reset** - Allow admins to send password reset emails from User Roles tab
7. **Dual Role Support** - Allow users to be both canvasser AND sales rep with view toggle

---

### Part 1: Database Schema Changes

#### 1.1 Modify user_roles Table for Dual Roles

Currently the `user_roles` table has a unique constraint on `user_id` alone, preventing dual roles. We need to:

1. Remove the unique index on `user_id` alone (keeping the composite unique on `user_id, role`)
2. Update the `has_role` function to check for existence of specific role
3. Add logic to support users having both "user" (sales rep) and "canvasser" roles

```sql
-- Remove the single-column unique constraint on user_id
DROP INDEX IF EXISTS user_roles_user_id_unique;

-- The composite unique (user_id, role) already exists and is what we want
-- This allows a user to have multiple roles (e.g., both 'user' and 'canvasser')
```

#### 1.2 Create New Profile Column for Primary View Preference

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_view text DEFAULT 'sales';
-- Values: 'sales' or 'canvasser'
```

---

### Part 2: Fix Lead-to-Close Calculation

#### 2.1 Update AdminOverview.tsx

The current "Lead Close %" for canvassers is calculated correctly:
```typescript
// Line 800-803 - Already correct!
value={`${canvasserAggregates.totalLeadsSet > 0 
  ? ((canvasserAggregates.totalLeadsClosed / canvasserAggregates.totalLeadsSet) * 100).toFixed(1) 
  : '0.0'}%`}
```

However, the Company Overview section needs to display:
- **Canvasser Lead-to-Close %**: Leads Set vs Leads Closed (currently correct)
- **Cost Per Lead**: Total Canvasser Income / Leads Closed (currently correct in CompanyGoals)

The issue mentioned may be in the CompanyGoals page calculation. Let me verify and fix:

#### 2.2 Update CompanyGoals.tsx

The current "Sales Lead-to-Close Rate" card (lines 616-667) uses `totalSalesClosedDeals / totalSalesLeads` which is sales rep data.

**Change needed**: Add a separate "Canvasser Lead-to-Close Rate" card or rename the existing one to clarify it's for sales reps.

The Cost Per Lead calculation (lines 669-720) is already correct:
```typescript
const currentCost = progress.totalLeadsClosed > 0 
  ? progress.totalCanvasserIncome / progress.totalLeadsClosed 
  : 0;
```

**Action**: Add a new metric card for "Canvasser Lead-to-Close Rate" showing:
- Formula: `(Canvasser Leads Closed / Canvasser Leads Set) * 100`
- Need to fetch `leads_set` in addition to `leads_closed` from canvasser_metrics

---

### Part 3: Rename "Not Interested" to "Canceled Lead"

Update the following files:

| File | Changes |
|------|---------|
| `src/pages/canvasser/CanvasserStats.tsx` | Line 261: "Not Interested" → "Canceled Lead" |
| `src/pages/admin/WeeklyUpdates.tsx` | Variable names & labels: "Not Interested" → "Canceled Lead" |
| `src/pages/admin/AdminLeaderboards.tsx` | Interface & table header: "notInterested" → "canceledLead" |
| `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx` | Header "Not Int." → "Canceled" |
| `src/pages/canvasser/CanvasserLeaderboard.tsx` | Interface field & mapping |
| `src/components/canvasser/CanvasserConversionFunnel.tsx` | Label if used |

Note: Database column remains `not_interested` for backward compatibility - only UI labels change.

---

### Part 4: Fix Leaderboard Ranking

#### 4.1 Current Issue

The YTD leaderboard sorts by `leads_closed`:
```typescript
// Line 169-171 in CanvasserLeaderboard.tsx
.sort((a, b) => {
  return (b.leads_closed || 0) - (a.leads_closed || 0);
})
```

**Fix**: Rank should be based on **Points** for consistency with how the leaderboard works:
```typescript
.sort((a, b) => (b.points || 0) - (a.points || 0))
```

#### 4.2 Update All Leaderboard Rankings

- YTD: Sort by `points` descending
- Weekly: Sort by `pointsEarned` descending
- Monthly: Sort by `pointsEarned` descending

---

### Part 5: Change Goal Terminology

#### 5.1 Update Goal Labels

Change "Yearly Goal (Leads Closed)" to "Contracts Signed From Leads"

Files to update:
- `src/components/canvasser/CanvasserGoalModal.tsx` - Label text
- `src/pages/canvasser/CanvasserSettings.tsx` - Label text
- `src/components/dashboard/CanvasserLeaderboardTable.tsx` - Column header "Goal" → "Contracts Goal"
- `src/pages/canvasser/CanvasserStats.tsx` - Goal display

---

### Part 6: Add Admin Password Reset

#### 6.1 Update admin-manage-user Edge Function

Add a new action `reset-password` that sends a password reset email:

```typescript
if (action === "reset-password") {
  // Generate password reset link using Supabase Admin API
  const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: targetUserEmail,
  });

  if (resetError) {
    return new Response(
      JSON.stringify({ error: "Failed to generate reset link" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Send email with reset link using Resend
  // ... (use existing Resend integration pattern)

  return new Response(
    JSON.stringify({ success: true, action: "reset-password" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

#### 6.2 Update UserRoles.tsx

Add a "Reset Password" button in the Actions column:

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => handlePasswordReset(user)}
  title="Send password reset"
>
  <KeyRound className="h-4 w-4" />
</Button>
```

---

### Part 7: Dual Role Support

This is the most complex feature. Here's the implementation plan:

#### 7.1 Database Changes

```sql
-- Remove single-user unique constraint (allow multiple roles per user)
DROP INDEX IF EXISTS user_roles_user_id_unique;

-- Add preferred view column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_view text DEFAULT 'sales';
```

#### 7.2 Update useAuth Hook

Modify to handle multiple roles:

```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];  // Changed from single role to array
  activeView: 'sales' | 'canvasser';
  sessionLoading: boolean;
  roleLoading: boolean;
}

// New helper functions:
const hasSalesRole = authState.roles.includes('user') || authState.roles.includes('admin');
const hasCanvasserRole = authState.roles.includes('canvasser');
const isDualRole = hasSalesRole && hasCanvasserRole;
```

#### 7.3 Update Admin User Roles UI

Allow setting multiple roles for a user:

```typescript
// In EditUserRoleModal.tsx
// Change from single role select to checkbox group:
<div className="space-y-2">
  <Checkbox 
    checked={isSalesRep} 
    onCheckedChange={setIsSalesRep}
  />
  <Label>Sales Rep</Label>
</div>
<div className="space-y-2">
  <Checkbox 
    checked={isCanvasser} 
    onCheckedChange={setIsCanvasser}
  />
  <Label>Canvasser</Label>
</div>
```

#### 7.4 Update admin-set-user-role Edge Function

Handle adding/removing multiple roles:

```typescript
// Accept array of roles
const { targetUserId, roles, salesRank, canvasserRank } = await req.json();

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

// Create/update metrics for each role...
```

#### 7.5 Create View Toggle Component

New component: `src/components/dashboard/RoleViewToggle.tsx`

```typescript
export function RoleViewToggle() {
  const { isDualRole, activeView, setActiveView } = useAuth();
  
  if (!isDualRole) return null;
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
      <span className="text-sm text-muted-foreground">View as:</span>
      <ToggleGroup type="single" value={activeView} onValueChange={setActiveView}>
        <ToggleGroupItem value="sales">Sales Rep</ToggleGroupItem>
        <ToggleGroupItem value="canvasser">Canvasser</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
```

#### 7.6 Update Layouts to Support View Toggle

Add toggle to both DashboardLayout and CanvasserLayout headers:

```typescript
// In DashboardHeader.tsx (for sales rep view)
<RoleViewToggle />
// When toggle changes to "canvasser", redirect to /canvasser-portal

// In CanvasserSidebar.tsx (for canvasser view)  
<RoleViewToggle />
// When toggle changes to "sales", redirect to /dashboard
```

#### 7.7 Update ProtectedRoute

Handle dual-role routing:

```typescript
// If user has both roles, allow access to both portals
// If user only has one role, redirect appropriately
if (isDualRole) {
  // Allow access based on current activeView
} else if (isCanvasser && !isSalesPath) {
  // Redirect canvasser-only users away from sales portal
} else if (!isCanvasser && isCanvasserPath) {
  // Redirect sales-only users away from canvasser portal
}
```

---

### Summary of Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| **Database Migration** | Create | Drop user_id unique constraint, add preferred_view |
| `supabase/functions/admin-manage-user/index.ts` | Modify | Add password reset action |
| `supabase/functions/admin-set-user-role/index.ts` | Modify | Support multiple roles |
| `src/hooks/useAuth.ts` | Modify | Handle multiple roles + view toggle |
| `src/pages/admin/UserRoles.tsx` | Modify | Add password reset button |
| `src/components/admin/EditUserRoleModal.tsx` | Modify | Multi-role selection |
| `src/components/dashboard/RoleViewToggle.tsx` | Create | New toggle component |
| `src/components/dashboard/DashboardHeader.tsx` | Modify | Add toggle |
| `src/components/canvasser/CanvasserSidebar.tsx` | Modify | Add toggle |
| `src/pages/canvasser/CanvasserLeaderboard.tsx` | Modify | Fix ranking, rename columns |
| `src/components/dashboard/WeeklyCanvasserLeaderboardTable.tsx` | Modify | Rename "Not Int." |
| `src/pages/canvasser/CanvasserStats.tsx` | Modify | Rename label, update goal text |
| `src/pages/admin/WeeklyUpdates.tsx` | Modify | Rename label |
| `src/pages/admin/CompanyGoals.tsx` | Modify | Add canvasser lead-to-close card |
| `src/components/canvasser/CanvasserGoalModal.tsx` | Modify | Update goal label |
| `src/pages/canvasser/CanvasserSettings.tsx` | Modify | Update goal label |
| `src/components/auth/ProtectedRoute.tsx` | Modify | Handle dual-role access |

---

### Technical Implementation Details

**Lead-to-Close Calculation Clarification:**
- **Sales Rep Lead-to-Close**: Canvass Deals Closed / Canvass Leads Assigned (already implemented correctly)
- **Canvasser Lead-to-Close**: Leads Closed / Leads Set (already implemented correctly)
- **Company Goals**: Will show both metrics separately with clear labels

**Cost Per Lead Calculation:**
- Formula: Total Canvasser Income / Leads Closed
- Already correctly implemented in CompanyGoals.tsx

**Leaderboard Ranking Fix:**
- All leaderboards will sort by Points (descending) for consistency
- This matches how the sales rep leaderboard works

**Password Reset Flow:**
1. Admin clicks "Reset Password" button in User Roles
2. Edge function generates a reset link using Supabase Admin API
3. Email is sent to user with reset link (using Resend)
4. User clicks link and sets new password

**Dual Role Architecture:**
- Users can have both `user` (sales rep) and `canvasser` roles
- A toggle in the header allows switching between views
- Each view shows the appropriate portal (dashboard vs canvasser-portal)
- Metrics are tracked separately for each role
- User preference is saved in `profiles.preferred_view`

