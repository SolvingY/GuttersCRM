

## Two Targeted Fixes

### FIX 1 — Disable React Query refetchOnWindowFocus

**File:** `src/App.tsx`, line 105

**Before:**
```typescript
queries: {
  staleTime: 1000 * 60 * 5,
  retry: 1,
},
```

**After:**
```typescript
queries: {
  staleTime: 1000 * 60 * 5,
  refetchOnWindowFocus: false,
  retry: 1,
},
```

One line added. Nothing else changes.

---

### FIX 2 — Personalized welcome with admin name

**File:** `src/pages/admin/AdminHome.tsx`

- Import `useAuth` from `@/hooks/useAuth` (same hook used across all protected pages)
- Extract first name from `authState.user.user_metadata.full_name` (first word), fall back to empty
- Replace `<h1>Home</h1>` with `<h1>Welcome back, FirstName.</h1>` or `<h1>Welcome back.</h1>` if no name

No skeleton, no extra fetch. One import + ~3 lines of logic added to the existing component.

---

### Also: Remove `force: true` from vite.config.ts

The previous fix added `force: true` to `optimizeDeps` which causes Vite to re-bundle deps on every dev server start. Now that React dedup is handled via `resolve.dedupe`, this flag should be removed.

---

### Files touched

| File | Change |
|------|--------|
| `src/App.tsx` | Add `refetchOnWindowFocus: false` (1 line) |
| `src/pages/admin/AdminHome.tsx` | Add useAuth + personalized h1 |
| `vite.config.ts` | Remove `force: true` |

