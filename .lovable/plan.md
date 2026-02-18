
## Two Fixes: Report Type Selection + Login Tracking in Contractor Management

---

### Fix 1: Report Type Selector in Export Modal

**Problem:** The `ReportDateRangeModal` only lets admins pick a date range and file format (Excel or PDF). There is no way to select *what type* of report to generate (Sales Team only, Canvassers only, or Combined). The export always includes both sales reps and canvassers regardless.

**Solution:** Add a "Report Type" toggle to `ReportDateRangeModal` with three options:
- **Combined** (default) — both sales reps and canvassers
- **Sales Team Only** — filters out canvasser data
- **Canvassers Only** — filters out sales rep data

The `onExport` callback signature gets extended with a `reportType` parameter. Both `AdminOverview.tsx` and `CompanyGoals.tsx` will use this to conditionally pass empty arrays to `exportToExcel` / `exportToPDF`.

**Files modified:**
- `src/components/dashboard/ReportDateRangeModal.tsx` — add `reportType` state and UI selector
- `src/pages/dashboard/AdminOverview.tsx` — handle `reportType` in `onExport`
- `src/pages/admin/CompanyGoals.tsx` — handle `reportType` in `onExport`

---

### Fix 2: Login Tracking in Contractor Management

**Problem:** Supabase's auth data (`last_sign_in_at`, login counts) lives in the protected `auth.users` table which cannot be queried by the JavaScript client. The Contractor Management page has no way to show "Most Recent Login" or "Times Logged Into The System."

**Solution:** Add two new columns to the `profiles` table:
- `last_login_at` (timestamptz, nullable) — updated each time a user's session is detected
- `login_count` (integer, default 0) — incremented each time

These are updated from the `DashboardLayout` and `CanvasserLayout` on mount (when `user` is confirmed), using a simple upsert to `profiles`. This piggybacks on the existing session-load pattern used for `WelcomeModal`, `GoalSettingModal`, and `DNAAssessmentPromptModal`.

The `ContractorManagement` page will fetch and display this data on each user card and in the `ContractorProfileSheet`.

**Database change:**
```sql
ALTER TABLE public.profiles
  ADD COLUMN last_login_at timestamptz,
  ADD COLUMN login_count integer DEFAULT 0;
```

No new RLS needed — the existing `profiles` policies already allow users to update their own record and admins to read all.

**Files modified:**
- `supabase/migrations/` — add new migration for the two columns
- `src/pages/dashboard/DashboardLayout.tsx` — update `last_login_at` and increment `login_count` on mount
- `src/pages/canvasser/CanvasserLayout.tsx` — same
- `src/pages/admin/ContractorManagement.tsx` — display `lastLoginAt` and `loginCount` on cards; include in enriched user object
- `src/components/admin/ContractorProfileSheet.tsx` — show login stats in the profile header section

---

### Technical Details

**Login tracking update pattern (DashboardLayout & CanvasserLayout):**
```typescript
useEffect(() => {
  if (!user) return;
  // Fire-and-forget — no await needed, non-blocking
  supabase.from('profiles').update({
    last_login_at: new Date().toISOString(),
    login_count: supabase.rpc('increment_login_count', { uid: user.id })
    // simplified — actual impl uses raw SQL increment
  }).eq('id', user.id);
}, [user?.id]);
```

Since Supabase doesn't support `col + 1` increments through the JS client's `.update()`, a small database function `increment_login_count(uid uuid)` will be created to do `UPDATE profiles SET login_count = login_count + 1, last_login_at = now() WHERE id = uid`. This is called via `supabase.rpc('increment_login_count', { uid: user.id })`.

**What displays on the Contractor card:**
- "Last Login: Feb 18, 2026 at 3:24 PM" (or "Never" if null)
- "Logins: 42"

**What displays in the ContractorProfileSheet header:**
- Same two fields, formatted more prominently in the profile header section alongside hire date.

---

### Summary of Files Changed

| File | Change |
|---|---|
| `supabase/migrations/new_migration.sql` | Add `last_login_at`, `login_count` to `profiles`; add `increment_login_count` RPC |
| `src/components/dashboard/ReportDateRangeModal.tsx` | Add report type selector (Combined / Sales Only / Canvassers Only) |
| `src/pages/dashboard/AdminOverview.tsx` | Use `reportType` to filter data passed to exporters |
| `src/pages/admin/CompanyGoals.tsx` | Same |
| `src/pages/dashboard/DashboardLayout.tsx` | Call `increment_login_count` RPC on mount |
| `src/pages/canvasser/CanvasserLayout.tsx` | Same |
| `src/pages/admin/ContractorManagement.tsx` | Show last login + login count on cards |
| `src/components/admin/ContractorProfileSheet.tsx` | Show login stats in sheet header |
