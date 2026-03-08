

# Fix: Add "Back to Dashboard" navigation on OnboardingFlow page

## Problem
When a user (whose onboarding is already complete) clicks the "Onboarding" sidebar link, they land on `/onboarding` and get stuck — there's no back button, no header nav, and no way to return to the dashboard.

## Solution
Add a back navigation button to the top of the `OnboardingFlow.tsx` header area. It will use `navigate(-1)` or link to the appropriate dashboard based on user role. This gives users who voluntarily visit onboarding (to review their progress) a clear way to go back.

### File: `src/pages/onboarding/OnboardingFlow.tsx`
- Add an `ArrowLeft` icon button in the header bar (top-left, before the title) that navigates back to the dashboard
- Use role-aware routing: admins → `/admin/onboarding`, canvassers → `/canvasser/stats`, supplementers → `/supplementer/stats`, default → `/dashboard/stats`
- Style: ghost button with "Back to Dashboard" text, consistent with existing UI

One small change, ~5 lines added to the header section.

