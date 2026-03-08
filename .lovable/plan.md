

# Fix: "Back to Dashboard" navigates to non-existent route

## Problem
The `getBackPath()` function in `OnboardingFlow.tsx` returns `/admin/onboarding` for admin users, but no such route exists in `App.tsx`. This causes the 404 page.

## Solution
Change the admin back path from `/admin/onboarding` to a route that actually exists. The most logical destination is `/admin/contractor-management` (the admin page that likely lists team members) or simply `/admin` (the admin overview).

### File: `src/pages/onboarding/OnboardingFlow.tsx` (line 83)
- Change `'/admin/onboarding'` → `'/admin'` (or whichever admin route is the main admin dashboard)

Additionally, use `navigate(-1)` as a fallback approach — this would take the user back to wherever they came from, which is the most natural UX. We can use `navigate(-1)` for the button action instead of a hardcoded path, which avoids this class of bug entirely.

### Recommended approach
Replace the back button's `onClick` from `navigate(getBackPath())` to `navigate(-1)`, which always returns to the previous page. Keep `getBackPath()` only as a fallback if there's no history (e.g., direct URL access).

One-line change in `OnboardingFlow.tsx`.

