

# Changes: Nav Cleanup, Rename, and Role Assignment Verification

## 1. Remove "Quote Requests" Nav Item

In `src/pages/admin/AdminLayout.tsx` line 73, the "Quote Requests" item (`/admin/leads?status=new`) is a duplicate link to the same Leads page with a filter. Remove this nav entry from the `pipeline-revenue` group.

## 2. Rename "HR / Onboarding" to "Future Team Mates"

Three files reference this label:
- **`src/pages/admin/AdminLayout.tsx`** line 97 — sidebar nav item
- **`src/pages/admin/AdminPresets.tsx`** line 30 — landing page option in presets

Both will be updated from `'HR / Onboarding'` to `'Future Team Mates'`.

## 3. Role Assignment Verification

The `EditUserRoleModal` already supports all four roles (Admin, Sales Rep, Canvasser, Supplementer) and the backend edge function `admin-set-user-role` handles them correctly — creating metrics rows and managing the `user_roles` table. The screenshot confirms this is working. No code changes needed here.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/admin/AdminLayout.tsx` | Remove Quote Requests nav item; rename HR / Onboarding |
| `src/pages/admin/AdminPresets.tsx` | Rename HR / Onboarding in landing page options |

