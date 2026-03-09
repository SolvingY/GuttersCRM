

# Plan: Add Production Role to All Role Selection UIs

Three files are missing the "Production" role option. The screenshot shows the Hire Applicant dialog lacking it, and the previous message identified the Edit User Role modal and User Roles page also need it.

## Changes

### 1. `src/components/admin/HireApplicantDialog.tsx`
- Add `"Production": "production"` to the `ROLE_MAPPING` object (line ~35)
- Add `<SelectItem value="production">Production</SelectItem>` to the Role select dropdown (after Supplementer, before Admin — line ~140)

### 2. `src/components/admin/EditUserRoleModal.tsx`
- Add `isProduction` state initialized from `user.roles.includes('production')` in useEffect
- Add `'production'` to the `UserWithRole.roles` type union
- Add Production checkbox with `HardHat` icon in the operational roles section (after Supplementer)
- Include `'production'` in the roles array on submit when checked
- Update `isValid`, `isAdminOnly`, `isSuperAdmin` checks to include `!isProduction` / `isProduction`
- Include production in `hiddenFromLeaderboard` visibility check
- Add production to success message builder

### 3. `src/pages/admin/UserRoles.tsx`
- Add `'production'` to the `UserWithRole.roles` type union
- Add amber badge in `getRoleBadges`: `<Badge className="bg-amber-500 text-white">Production</Badge>`

### 4. `supabase/functions/admin-set-user-role/index.ts`
- Add `'production'` to `validRoles` array
- Update `isAdminOnly` to include `!hasProductionRole`
- Add `hasProductionRole` flag
- Add production metrics creation block (upsert `production_metrics` row when role assigned)

| File | Change |
|------|--------|
| `HireApplicantDialog.tsx` | Add "Production" to role mapping + select dropdown |
| `EditUserRoleModal.tsx` | Add production checkbox, state, validation |
| `UserRoles.tsx` | Add production to type union + amber badge |
| `admin-set-user-role/index.ts` | Add production to valid roles + auto-create metrics |

