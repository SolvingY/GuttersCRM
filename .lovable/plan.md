

# Plan: Daily Login History Table + Fix Location Capture

## Two Issues

### Issue 1: No Daily Login History
Currently the system only tracks `last_login_at` and `login_count` on the profiles table — no individual log entries. You can't see a day-by-day breakdown of when someone logged in.

### Issue 2: "Location not captured" on Clock-In
The `getLocation()` function silently swallows geolocation errors (resolves `null` without logging the reason). The most likely cause: the browser denied the permission or the iframe context blocked it. The error callback doesn't log anything, making debugging impossible. We need to:
- Log the actual geolocation error reason to console
- Show a more descriptive toast (e.g. "Permission denied" vs "Timed out" vs "Position unavailable")
- Request permission explicitly before giving up

---

## Database Change

Create a `login_history` table:

```sql
CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON public.login_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all login history"
  ON public.login_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert own login"
  ON public.login_history FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

## Code Changes

### 1. Record Login Events
In all four layout files (`DashboardLayout.tsx`, `CanvasserLayout.tsx`, `SupplementerLayout.tsx`, `AdminLayout.tsx`), alongside the existing `increment_login_count` RPC call, also insert a row into `login_history` with the user ID and timestamp. Use the same session key guard so it only fires once per day.

### 2. Admin View of Login History
Add a way for admins to see login history — either in the Contractor Management profile sheet or a dedicated section. Show a table of recent logins (date, time) for any user.

### 3. Fix Location Capture (`TimeClockWidget.tsx`)
Update `getLocation()` to:
- Log the actual `GeolocationPositionError` code and message to console
- Show a more specific toast: "Location permission denied — please allow location access in your browser settings" vs "Location timed out — trying again" vs generic fallback
- Increase timeout from 10s to 15s
- Add a retry on timeout (one retry attempt)

### Files Modified
| File | Change |
|------|--------|
| Migration SQL | Create `login_history` table |
| `src/pages/dashboard/DashboardLayout.tsx` | Insert into `login_history` on login |
| `src/pages/canvasser/CanvasserLayout.tsx` | Same |
| `src/pages/supplementer/SupplementerLayout.tsx` | Same |
| `src/pages/admin/AdminLayout.tsx` | Same |
| `src/pages/admin/ContractorManagement.tsx` or profile sheet | Display login history for admin review |
| `src/components/canvasser/TimeClockWidget.tsx` | Fix `getLocation()` error handling, add retry, descriptive toasts |

