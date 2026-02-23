

# Add Email Viewing and Editing to User Management

## Overview
Currently the User Roles page doesn't show user emails because email addresses are stored in the auth system, which can't be queried from the client. We need a backend function to fetch emails and another action to update them.

## Changes

### 1. Extend the `admin-manage-user` edge function

Add two new actions:

- **`fetch-emails`**: Accepts an array of user IDs, uses the admin API to look up each user's email, and returns a `{ userId: email }` map. This keeps the existing single-function pattern.
- **`update-email`**: Accepts `targetUserId` and `newEmail`, uses `supabaseAdmin.auth.admin.updateUserById()` to change the email.

Both actions will require the caller to be an admin (same auth check already in place).

### 2. Update `UserRoles.tsx` -- Display emails

- After fetching profiles and roles, call `admin-manage-user` with `action: 'fetch-emails'` passing all user IDs.
- Merge the returned email map into the `UserWithRole` objects.
- Add an **Email** column to the table between Name and Roles.

### 3. Add inline email editing

- Add an "Edit Email" button (mail icon) next to each user's email in the table.
- When clicked, open a small dialog with an input field pre-filled with the current email.
- On submit, call `admin-manage-user` with `action: 'update-email'` and refresh the user list.

## Technical Details

### Edge Function Changes (`supabase/functions/admin-manage-user/index.ts`)

**New action validation** (line 75): Add `'fetch-emails'` and `'update-email'` to the valid actions list.

**Skip admin-target protection for email actions**: The existing check that prevents actions on admin users should be skipped for `fetch-emails` and `update-email` since admins should be able to view/edit any user's email.

**`fetch-emails` handler**:
```typescript
if (action === "fetch-emails") {
  const { userIds } = body;  // string[]
  const emailMap: Record<string, string> = {};
  for (const uid of userIds) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
    if (data?.user?.email) emailMap[uid] = data.user.email;
  }
  return Response({ emailMap });
}
```

**`update-email` handler**:
```typescript
if (action === "update-email") {
  const { newEmail } = body;
  await supabaseAdmin.auth.admin.updateUserById(targetUserId, { email: newEmail });
  return Response({ success: true });
}
```

### Frontend Changes (`src/pages/admin/UserRoles.tsx`)

1. **Email fetching**: After building the `combined` users array, extract all user IDs and call `admin-manage-user` with `fetch-emails`. Merge results into each user's `email` field.

2. **Email column**: Add `<TableHead>Email</TableHead>` after the Name column. Display the email in a `<TableCell>` with a small edit button (pencil/mail icon).

3. **Edit Email Dialog**: Create a new state for `editEmailUser` and `editEmailDialogOpen`. The dialog contains:
   - Current email (read-only display)
   - New email input field
   - Save button that calls `admin-manage-user` with `update-email`
   - Success toast and refresh on completion

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/admin-manage-user/index.ts` | Add `fetch-emails` and `update-email` actions |
| `src/pages/admin/UserRoles.tsx` | Fetch and display emails, add edit email dialog |

