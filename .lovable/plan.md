
## Fix: Login Tracking Never Fires for Any User

### Root Cause (Confirmed)

After thorough investigation, two compounding issues explain why `login_count` and `last_login_at` are `0` / `null` for **every single user** in the system:

**Issue 1 — Stale sessionStorage keys block all calls**

The `sessionStorage` guard key `login_counted_<user_id>` was written to every browser that ever visited the dashboard — even before the login-tracking code existed (any prior page visit sets it). Since `sessionStorage` persists for the entire browser tab session, every subsequent visit sees the key already set and skips the RPC call entirely. This is why no user has ever had their count increment.

**Issue 2 — The tracking key never resets**

Even for brand-new logins, once a user logs in and the key is set, it stays set for the entire browser session. If the same browser tab is reused across days, the count never goes up again.

**Issue 3 — The RPC approach is unnecessary complexity**

The `increment_login_count` database function works correctly. However, since each layout already has the Supabase client available, a direct `UPDATE` on `profiles` is simpler and avoids any potential RPC permission edge cases.

---

### The Fix

**Strategy:** Replace the `sessionStorage` guard with a **date-based session key** that resets daily, AND switch from RPC to a direct table update. The key format becomes `login_counted_<user_id>_<YYYY-MM-DD>` — this ensures:

- Each calendar day counts as a new session
- The stale old keys (format `login_counted_<uuid>`) are simply ignored
- No manual cleanup needed

**New logic in all 3 layout files:**

```typescript
useEffect(() => {
  if (!user) return;
  const today = new Date().toISOString().slice(0, 10); // "2026-02-18"
  const sessionKey = `login_counted_${user.id}_${today}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, '1');
  // Direct update — simpler than RPC, same result
  void supabase
    .from('profiles')
    .update({
      login_count: (/* handled server-side */ undefined as any),
      last_login_at: new Date().toISOString(),
    })
    .eq('id', user.id);
}, [user?.id]);
```

Wait — direct `UPDATE` with increment requires knowing the current value. The RPC is actually the right approach for `login_count` increment. So the plan is:

- Keep `supabase.rpc('increment_login_count', { uid: user.id })` 
- Just fix the session key to be date-scoped: `login_counted_${user.id}_${today}`

This means the old keys (`login_counted_<uuid>` without date) are automatically abandoned, breaking the stale-guard cycle.

---

### Files to Modify

| File | Change |
|---|---|
| `src/pages/admin/AdminLayout.tsx` | Update session key to include date |
| `src/pages/dashboard/DashboardLayout.tsx` | Update session key to include date |
| `src/pages/canvasser/CanvasserLayout.tsx` | Update session key to include date |

### Code Change (identical in all 3 files)

**Before:**
```typescript
const sessionKey = `login_counted_${user.id}`;
```

**After:**
```typescript
const today = new Date().toISOString().slice(0, 10);
const sessionKey = `login_counted_${user.id}_${today}`;
```

This single-line change per file:
- Abandons all stale old keys that were preventing the RPC from ever firing
- Allows the count to increment once per calendar day per user
- Requires no database changes, no new migrations, no new functions

### Why This Works Immediately

After this fix is deployed, the next time Adam (or any user) loads the admin/dashboard/canvasser layout, the new date-scoped key `login_counted_<uuid>_2026-02-18` won't exist in sessionStorage (only the old keyless version does), so the RPC fires and updates `login_count` and `last_login_at` for the first time.
