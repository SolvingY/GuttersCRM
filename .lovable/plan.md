

# Navigation Persistence Fixes — Implementation Plan

All three fixes are confirmed and ready to execute. Here's the precise plan:

## FIX 1 — QueryClient (1 file, 1 line)

**`src/App.tsx`** line 108: Add `refetchOnReconnect: false` after `refetchOnWindowFocus: false`.

## FIX 2 — URL Search Param Tab Persistence (5 files)

Each file gets the same pattern: import `useSearchParams`, read initial tab from URL param, write tab changes back to URL.

| File | State variable (line) | URL param | Default |
|---|---|---|---|
| `ContractorManagement.tsx` | `tab` (L68) | `?tab=` | `active` |
| `UserRoles.tsx` | `activeTab` (L59) | `?tab=` | `active` |
| `FutureTeamMates.tsx` | `tab` (L33) | `?tab=` | `active` |
| `AdminLeaderboards.tsx` | `timeFrame` (L44) | `?timeFrame=` | `weekly` |
| `AdminTimeClock.tsx` | `openSection` (L111) | `?section=` | `hours` |

**Pattern applied to each:**
1. Add `useSearchParams` import from `react-router-dom`
2. Replace `useState("default")` with `searchParams.get("paramKey") ?? "default"`
3. On change: `setSearchParams(prev => { prev.set("paramKey", newValue); return prev; }, { replace: true })`

## FIX 3 — localStorage Draft Autosave (3 files)

| File | localStorage key | Fields persisted |
|---|---|---|
| `CommercialHailAssessmentForm.tsx` | `ngr_draft_hail_assessment` | `form`, `homeowner`, `linkedJob` |
| `InspectionChecklist.tsx` | `ngr_draft_inspection_checklist` | `conditions`, `perimeterChecks`, `insideChecks`, `preExisting`, `safetyConcerns`, `notes` |
| `InternalAssessment.tsx` | `ngr_draft_internal_assessment_${user.id}` | `dnaAnswers`, `narrativeOwnership`, `narrativeMentor`, `narrativeWhyNgr`, `desiredPosition`, `step` |

**Pattern applied to each:**
1. On mount: `try { const saved = localStorage.getItem(key); if (saved) { /* parse and set state */ } } catch {}`
2. On state change: `useEffect` writes all persisted fields to localStorage
3. On successful submit: `localStorage.removeItem(key)`
4. On Cancel: `localStorage.removeItem(key)` (where Cancel button exists)

**Note:** Photos/blobs are NOT persisted (they can't serialize to JSON). Only text/checkbox/selection state is saved.

## Total: 9 files touched

No database changes. No new dependencies.

