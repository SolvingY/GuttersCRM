

## Multi-Role Geofence Time Clock — Implementation Plan

This build adds time clocks for sales reps, supplementers, and a new office role, all sharing a unified `role_shifts` table with geofencing.

---

### Step 1 — Database Migration

Single migration:
- `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'office'`
- `CREATE TABLE public.role_shifts` (id, user_id, role, clock_in_at, clock_out_at, clock_in_lat/lng, clock_out_lat/lng, hours_worked, status, notes, flagged_reason, edited_by, edited_at, created_at, updated_at)
- RLS: users manage own rows, admins manage all (using `has_role`)
- Partial unique index: `ON role_shifts (user_id) WHERE clock_out_at IS NULL`

---

### Step 2 — Auth Context & ProtectedRoute

**`src/contexts/AuthContext.tsx`**
- Add `'office'` to `AppRole` type union (line 5)
- Add `'office'` to `activeView` type unions (lines 11, 33, 36)
- Add `hasOfficeRole: boolean` and `isOfficeOnly: boolean` to `AuthContextValue`
- In `useMemo` (line ~230): compute `hasOfficeRole = roles.includes('office')`, include in `roleCount` for `isDualRole`, compute `isOfficeOnly`
- Add `'office'` to role priority chain for the `role` computed string

**`src/components/auth/ProtectedRoute.tsx`** — Role-specific redirects (Addition 2)
- Add `requireOffice` prop
- Destructure `hasOfficeRole`, `isOfficeOnly` from auth
- Helper function `getRoleHome()`: admin→`/admin`, canvasser-only→`/canvasser`, supplementer-only→`/supplementer`, production-only→`/production`, office-only→`/office/dashboard`, sales→`/dashboard`, fallback→`/`
- `requireOffice` gate: redirect non-office non-admin to their role home
- Office-only users: redirect away from `/dashboard`, `/canvasser`, `/supplementer`, `/production`, `/admin` to `/office/dashboard`
- Non-office non-admin users: redirect away from `/office` to their role home
- Update existing redirects (isProductionOnly, isSupplementerOnly, isCanvasser, etc.) to use role-specific homes instead of hardcoded `/dashboard`

---

### Step 3 — Shared Time Clock Widget

**New file: `src/components/shared/RoleTimeClockWidget.tsx`**

Fork of `ProductionTimeClockWidget.tsx` (414 lines). Changes:
- Props: `{ role: 'user' | 'supplementer' | 'office'; onShiftChange?: () => void }`
- All queries use `role_shifts` (cast as `any`)
- Active shift detection: query where `user_id = user.id AND clock_out_at IS NULL` (role-agnostic, matches unique index)
- Clock-in insert: `{ user_id, role, status: 'active', clock_in_lat, clock_in_lng }`
- Clock-out: `{ clock_out_at, hours_worked, notes, status, clock_out_lat, clock_out_lng }`
- **No** `production_daily_logs` upsert
- Geofence logic: identical copy (geofence_work_zones + canvasser_zone_assignments)
- Clock-out modal: notes only

---

### Step 4 — Integrate into Existing Portals

**`src/pages/dashboard/MyStats.tsx`**
- Import `RoleTimeClockWidget`
- Add `<RoleTimeClockWidget role="user" />` above the motivational quote card (before line 290)

**`src/pages/supplementer/SupplementerDashboard.tsx`**
- Import `RoleTimeClockWidget`
- Add `<RoleTimeClockWidget role="supplementer" />` at top of the return (before line 126)

---

### Step 5 — Office Portal (4 new files)

**`src/components/office/OfficeSidebar.tsx`**
- Fork of `ProductionSidebar.tsx`, 2 nav items: Dashboard (`/office/dashboard`), Settings (`/office/settings`). Briefcase icon, label "Office".

**`src/pages/office/OfficeLayout.tsx`**
- Fork of `ProductionLayout.tsx`, uses `OfficeSidebar`. Same login tracking pattern.

**`src/pages/office/OfficeDashboard.tsx`**
- Welcome header from profiles `full_name`
- `<RoleTimeClockWidget role="office" />`
- Profile card (name, email, phone, start_date)

**`src/pages/office/OfficeSettings.tsx`**
- Password change form + profile update (phone, emergency contact)
- Pattern matches `ProductionSettings.tsx` but uses `profiles` table

---

### Step 6 — App.tsx Routing

Add lazy imports for `OfficeLayout`, `OfficeDashboard`, `OfficeSettings`.

Add route block after production routes:
```
<Route path="/office" element={<ProtectedRoute requireOffice><OfficeLayout /></ProtectedRoute>}>
  <Route index element={<Navigate to="/office/dashboard" replace />} />
  <Route path="dashboard" element={<OfficeDashboard />} />
  <Route path="settings" element={<OfficeSettings />} />
</Route>
```

---

### Step 7 — Admin Role Management

**`src/components/admin/EditUserRoleModal.tsx`**
- Add `isOffice` state, initialize from `user.roles.includes('office')`
- Add Briefcase icon checkbox after Production (line ~317)
- Include `'office'` in roles array build (line ~113)
- Update `isAdminOnly` (line 116): add `&& !isOffice`
- Update `isValid` (line 163): add `|| isOffice`
- Update `hiddenFromLeaderboard` condition and role names display
- Update `UserWithRole` interface to include `'office'`

**`src/components/admin/HireApplicantDialog.tsx`**
- Add `<SelectItem value="office">Office Staff</SelectItem>` after production

**`supabase/functions/admin-set-user-role/index.ts`**
- Add `'office'` to `validRoles` array (line 87)
- Update error message (line 91)
- Line 180: update admin-only check to also skip metrics for office-only users (office has no metrics table)

---

### Step 8 — Admin TimeClock Page

**`src/pages/admin/AdminTimeClock.tsx`** (1052 lines)

Addition 1 check: The file has **zero** production shift display logic. All queries hit `canvasser_shifts` and `canvasser_metrics`. So ProductionShiftManagement is built fresh.

Changes:
- Import `Tabs, TabsList, TabsTrigger, TabsContent`
- Wrap the existing `SectionCarousel` (lines 520-877) inside a `TabsContent value="canvassers"` block
- Add `Tabs` wrapper with 5 tabs: Canvassers, Sales, Supplementers, Production, Office
- Update page header to be generic ("TimeClock — Manage team hours, shifts, and GPS locations")

**New inline component: `RoleShiftManagement`**
- Props: `{ role: string; roleLabel: string }`
- Fetches users for the role from `user_roles` + `profiles` (not from metrics tables — office has none)
- Fetches active shifts from `role_shifts` where `role = prop` and `clock_out_at IS NULL`
- Fetches shift history with date filter from `role_shifts` where `role = prop`
- Shows: currently clocked in users, shift history table (Name, Date, Clock In, Clock Out, Hours, Notes, Clock-In/Out location, Status, Actions)
- Edit modal: clock in/out times + notes (no doors/convos/leads)
- Delete per row

**New inline component: `ProductionShiftManagement`**
- Same pattern but queries `production_shifts`
- Fetches users from `user_roles` where `role = 'production'` + `profiles`
- Shows: active shifts, shift history, edit/delete
- Columns: Name, Date, Clock In, Clock Out, Hours, Notes, Locations, Status, Actions

---

### Files Summary

| File | Action |
|------|--------|
| DB migration | `office` enum + `role_shifts` table + RLS + index |
| `src/contexts/AuthContext.tsx` | Add office role flags |
| `src/components/auth/ProtectedRoute.tsx` | Add `requireOffice`, role-specific redirects |
| `src/App.tsx` | Add office routes |
| `src/components/shared/RoleTimeClockWidget.tsx` | **New** shared time clock |
| `src/pages/dashboard/MyStats.tsx` | Add sales time clock |
| `src/pages/supplementer/SupplementerDashboard.tsx` | Add supplementer time clock |
| `src/components/office/OfficeSidebar.tsx` | **New** |
| `src/pages/office/OfficeLayout.tsx` | **New** |
| `src/pages/office/OfficeDashboard.tsx` | **New** |
| `src/pages/office/OfficeSettings.tsx` | **New** |
| `src/components/admin/EditUserRoleModal.tsx` | Add office checkbox |
| `src/components/admin/HireApplicantDialog.tsx` | Add office option |
| `supabase/functions/admin-set-user-role/index.ts` | Add office to valid roles |
| `src/pages/admin/AdminTimeClock.tsx` | Add role tabs + RoleShiftManagement + ProductionShiftManagement |

### Not Touched
- `TimeClockWidget.tsx`, `ProductionTimeClockWidget.tsx`, `canvasser_shifts`, `production_shifts`, `geofence_work_zones`, `canvasser_zone_assignments`

