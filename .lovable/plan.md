

# Fix Admin Navigation in Lead Document Forms

## Problem
When an admin opens a document form (Contract, Appointment, Inspection, Flex Schedule) from `/admin/leads/:id`, the "Back to Lead" button and post-save navigation always redirect to `/dashboard/leads/:id` — sending them to the sales rep's "My Leads" page instead of back to the admin lead detail.

## Changes

### 4 form files need the same fix pattern

Each file hardcodes `/dashboard/leads/${id}` for navigation. Fix by detecting the current route prefix from `location.pathname` and using `/admin/leads/${id}` when appropriate.

| File | Lines to fix |
|------|-------------|
| `src/pages/dashboard/forms/GutterContract.tsx` | Lines 321, 348 (save + recall navigate), plus "Back" button |
| `src/pages/dashboard/forms/AppointmentSheet.tsx` | Lines 103, 113 (save navigate + Back button) |
| `src/pages/dashboard/forms/InspectionChecklist.tsx` | Lines 139, 149 (save navigate + Back button) |
| `src/pages/dashboard/forms/FlexSchedule.tsx` | Lines 122, 132 (save navigate + Back button) |

**Pattern applied to each file:**
```typescript
const isAdmin = location.pathname.startsWith("/admin");
const backPath = isAdmin ? `/admin/leads/${id}` : `/dashboard/leads/${id}`;
```
Then replace all hardcoded `/dashboard/leads/${id}` with `backPath`.

### Also included: the approved plan items
- Hide gutter-only documents (Contract, Inspection, Flex Schedule) from roofing leads in `LeadDetail.tsx`
- Adjust progress bar denominator for roofing vs gutter leads

