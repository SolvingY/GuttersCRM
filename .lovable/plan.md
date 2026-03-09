

# Fix "View Report" Drawer for Saved Checklists

## Problem
The View drawer for production checklists shows almost nothing because:
1. The `responses` field stores item **UUIDs** as keys (e.g., `{"abc-123": true}`), not human-readable labels
2. The drawer renders these UUID keys directly, which either shows gibberish or nothing useful

## Fix

**File:** `src/pages/tools/SavedChecklists.tsx`

When a production checklist detail item is opened, fetch the checklist template from `production_checklists` using the stored `checklistId` to get item labels. Then render the responses using the resolved labels instead of raw IDs.

Changes:
1. Add a `useEffect` (or extend the existing photo-loading effect) that fires when `detailItem` is set and `type === "production_checklist"`. It fetches the checklist template from `production_checklists` where `id = detailItem.fullData.checklistId`, extracts `checklist_items`, and stores them in a local state (`checklistTemplate`).
2. Update the production checklist rendering section (lines 338-349) to map item IDs to their labels from the fetched template, falling back to the raw ID if the template lookup fails.
3. Also display the checklist title from the template.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/tools/SavedChecklists.tsx` | Fetch checklist template on detail open; resolve item IDs to labels in the drawer |

