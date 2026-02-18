
## Fix: Login Tracking for Admin Users

### Root Cause

The `increment_login_count` RPC call and the `sessionStorage` guard logic live exclusively in:
- `DashboardLayout.tsx` (for `/dashboard/*` routes)
- `CanvasserLayout.tsx` (for `/canvasser/*` routes)

**AdminLayout.tsx has no login tracking at all.** Since Adam (and all admins) are redirected to `/admin` after login — not `/dashboard` — the tracking `useEffect` never fires.

The session screenshot confirms this: "Last Login: Never" and "Logins: 0" even after being logged in as an admin.

### Fix

Add the identical login tracking `useEffect` to `AdminLayout.tsx`:

```typescript
// Track login on mount — sessionStorage guard prevents duplicate counts on auth refresh
useEffect(() => {
  if (!user) return;
  const sessionKey = `login_counted_${user.id}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, '1');
  void supabase.rpc('increment_login_count', { uid: user.id });
}, [user?.id]);
```

The `sessionStorage` key `login_counted_${user.id}` is shared across all three layouts, so:
- If an admin visits `/admin` first → count fires, key is set
- If they then navigate to `/dashboard` or `/canvasser` → key already exists, count is skipped
- This prevents double-counting for dual-role admins who switch portals

### Files to Modify

| File | Change |
|---|---|
| `src/pages/admin/AdminLayout.tsx` | Add `useEffect` import (already there via useState), add login tracking effect, add `supabase` import (already imported) |

The fix is minimal — one `useEffect` block added to `AdminLayout.tsx`. No database changes needed, no new migrations required.
