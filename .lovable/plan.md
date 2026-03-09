

# Fix: Add Production Role to Create Account Form

## Problem

The "Create Account" form in `InviteUsers.tsx` is missing the "Production" option from the Account Type dropdown. The `HireApplicantDialog` already supports `production` as a role type, and the `create-user` edge function handles it, but the manual account creation form was never updated.

## Changes

**File:** `src/pages/dashboard/InviteUsers.tsx`

1. **Update the type** on line 62: Add `'production'` to the `manualRoleType` union type
2. **Add SelectItem** between Supplementer and Super Admin on line 653-654: `<SelectItem value="production">Production</SelectItem>`
3. **Update the onValueChange cast** on line 645 to include `'production'` in the union

Also need to verify the `create-user` edge function handles `production` — checking the `getRoleConfig` function shows it doesn't have a `production` case, so it falls through to the default (creates a `user` role with sales metrics). Need to add a `production` case there too.

**File:** `supabase/functions/create-user/index.ts`

4. Add `case 'production'` to `getRoleConfig` that assigns `roles: ['production']` with no sales/canvasser/supplementer metrics (matching how `HireApplicantDialog` uses it)

