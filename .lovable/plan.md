

## Fix: Tab-Switch Reload — Auth Context + Token Refresh Filter

### Problem
`useAuth()` is a standalone hook. Every consumer creates its own auth subscription. On `TOKEN_REFRESHED` (every tab return), each instance sets `roleLoading: true`, causing `ProtectedRoute` to show spinner and unmount/remount all children.

### Changes (3 files, no DB changes)

**1. Create `src/contexts/AuthContext.tsx`**
- Move all auth state, subscriptions, and derived values from `useAuth.ts` into an `AuthProvider` component
- Single `onAuthStateChange` subscription for the entire app
- **Key fix**: Filter by event type — `TOKEN_REFRESHED` silently updates session/user without setting `roleLoading: true` or re-fetching roles
- Memoize context value with `useMemo` keyed on `authState` to prevent unnecessary re-renders
- Export `useAuth()` as `useContext(AuthContext)`

**2. Replace `src/hooks/useAuth.ts`**
- Entire file becomes a re-export: `export { useAuth } from '@/contexts/AuthContext'`
- All existing imports across the codebase continue working with zero changes

**3. Edit `src/App.tsx`**
- Import `AuthProvider` from `@/contexts/AuthContext`
- Wrap inside `QueryClientProvider` > `AuthProvider` > `TooltipProvider` > ...

### Key logic in AuthProvider's onAuthStateChange

```typescript
(event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // Silent update — no roleLoading, no role re-fetch, no spinner
    setAuthState(prev => ({
      ...prev,
      session,
      user: session?.user ?? null,
    }));
    return;
  }
  // SIGNED_IN, SIGNED_OUT, USER_UPDATED — full reset + role fetch
  // ... existing logic ...
}
```

### What this fixes
- Tab switch / app switch no longer triggers visible reload or spinner
- Single auth subscription instead of duplicates per consumer
- Memoized value prevents cascade re-renders
- All role-based routing, login, logout unchanged

