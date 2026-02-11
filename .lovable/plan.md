

## Plan: Admin Direct Password Reset

### What We're Building
A feature where admins can type in a new password for any user directly from the User Roles page, and it takes effect immediately. No emails needed.

### How It Will Work
1. Admin clicks the key icon next to a user
2. A modal opens with a password input field and a confirm password field
3. Admin types the new password and clicks "Set Password"
4. The password is updated instantly -- the admin then tells the user their new password

### Technical Changes

**1. New Modal Component: `src/components/admin/SetPasswordModal.tsx`**
- Dialog with two password fields (new password + confirm)
- Minimum 6 character validation
- Calls the edge function to set the password

**2. Update Edge Function: `supabase/functions/admin-manage-user/index.ts`**
- Add a new action: `set-password`
- Accepts `newPassword` in the request body
- Uses `supabaseAdmin.auth.admin.updateUserById(targetUserId, { password: newPassword })` to set the password directly
- No email sending needed

**3. Update User Roles Page: `src/pages/admin/UserRoles.tsx`**
- Replace the current `handlePasswordReset` (email-based) with opening the new `SetPasswordModal`
- Add state for the modal and pass the selected user to it

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/admin/SetPasswordModal.tsx` | Create new modal component |
| `supabase/functions/admin-manage-user/index.ts` | Add `set-password` action |
| `src/pages/admin/UserRoles.tsx` | Wire up the new modal instead of email reset |

### Edge Function Change Detail

Add `"set-password"` to the allowed actions list, then add this handler:

```typescript
if (action === "set-password") {
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUserId,
    { password: newPassword }
  );
  // return success or error
}
```

Password validation (minimum 6 characters) will be enforced both client-side and server-side.

