

## Fix: Expand Silent-Update Guard for Tab-Switch Reload

**File:** `src/contexts/AuthContext.tsx` — 3 surgical changes:

### Change 1 — Add `useRef` to import (line 1)
Add `useRef` to the existing React import.

### Change 2 — Add ref mirror (after line 55)
```typescript
const authStateRef = useRef(authState);
authStateRef.current = authState;
```

### Change 3 — Replace `onAuthStateChange` handler (lines 118–146)
Expand the silent guard to catch both `TOKEN_REFRESHED` and `SIGNED_IN` for the same already-loaded user. Read from `authStateRef.current` to avoid stale closures:

```typescript
(event, session) => {
  if (
    (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') &&
    session?.user &&
    authStateRef.current.user?.id === session.user.id &&
    !authStateRef.current.roleLoading
  ) {
    setAuthState(prev => ({ ...prev, session, user: session.user }));
    return;
  }
  // ... full reset path unchanged
}
```

The `getSession` block (lines 148–163) and dependency array `[fetchAllUserData]` remain untouched. One file, no database changes.

