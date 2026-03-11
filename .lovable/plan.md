

## Add /admin/home as New Default Admin Landing Page

### What Changes

1. **New file: `src/pages/admin/AdminHome.tsx`** — Placeholder page with heading and description text as specified.

2. **`src/App.tsx`** — Three changes:
   - Add lazy import: `const AdminHome = lazy(() => import("./pages/admin/AdminHome"));`
   - Line 251: Change default redirect from `/admin/overview` to `/admin/home`
   - Add route: `<Route path="home" element={<AdminHome />} />` alongside existing admin routes

3. **`src/pages/admin/AdminPresets.tsx`** — Add one entry to `LANDING_PAGE_OPTIONS` array:
   ```ts
   { value: '/admin/home', label: 'Home' },
   ```
   Place it as the first item in the array. All existing options remain unchanged.

### What Does NOT Change
- `AdminOverview.tsx` — zero changes
- `AdminLayout.tsx` nav items — zero changes (Scoreboard stays as top-level nav item)
- `AdminLayout.tsx` preset override logic (lines 252–256) — works as-is since it navigates to whatever path is stored in the preset
- All other routes, portals, and non-admin routing

### Add Nav Item for Home

Add a new top-level `NavLink` for "Home" with the `Home` icon pointing to `/admin/home`, placed **above** the existing Scoreboard nav item in `AdminLayout.tsx`. This gives admins a way to navigate back to the home page from the sidebar.

