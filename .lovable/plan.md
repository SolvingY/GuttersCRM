

# Fix: Supplementer View Toggle Not Navigating Correctly

## Problem

When a dual-role user (e.g., Admin + Supplementer) clicks the "Supplementer" toggle, the view stays on the Sales Rep dashboard showing sales metrics instead of navigating to the Supplementer portal. Two related bugs cause this:

1. **State/URL desync**: The `activeView` value (persisted in the database) can become "supplementer" while the user is on `/dashboard/stats`. Since the toggle already shows "supplementer" as selected, clicking it again does nothing -- the ToggleGroup component doesn't fire for already-active values.

2. **Missing supplementer cases in the header**: The `DashboardHeader` component doesn't recognize the supplementer portal -- it always shows "Sales Rep Dashboard" and never shows a "Supplementer" badge.

---

## Fix 1: Sync `activeView` with Current URL (RoleViewToggle.tsx)

Add a `useEffect` that keeps `activeView` synchronized with the current route. When the URL changes (e.g., user navigates to `/dashboard/stats`), the toggle updates to match the actual portal they're viewing.

**File:** `src/components/dashboard/RoleViewToggle.tsx`

**Changes:**
- Import `useEffect` from React
- Add a `useEffect` that watches `location.pathname` and sets `activeView` based on which portal route is active:
  - `/supplementer/*` sets `activeView` to `'supplementer'`
  - `/canvasser/*` sets `activeView` to `'canvasser'`
  - `/dashboard/*` sets `activeView` to `'sales'`
- This ensures the toggle always reflects the current portal, preventing the "already selected" dead-click issue

---

## Fix 2: Add Supplementer Cases to DashboardHeader (DashboardHeader.tsx)

**File:** `src/components/dashboard/DashboardHeader.tsx`

**Changes:**
- Update `getPortalTitle()` to return `'Supplementer Portal'` when the path starts with `/supplementer`
- Update `getRoleBadge()` to show a "Supplementer" badge when `hasSupplementerRole` is true (and user is not admin or canvasser-only)
- Import `hasSupplementerRole` from `useAuth()`

---

## Files Modified (2)

| File | Change |
|---|---|
| `src/components/dashboard/RoleViewToggle.tsx` | Add useEffect to sync activeView with current URL path |
| `src/components/dashboard/DashboardHeader.tsx` | Add supplementer portal title and role badge |

