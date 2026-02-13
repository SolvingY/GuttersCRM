

## Fix Canvasser Names Showing as "Unknown" in PDF Export

### Root Cause
The canvasser name resolution (line 420 in `AdminOverview.tsx`) only checks `canvasser_metrics.display_name`. If that field is empty/null, it falls back to "Unknown Canvasser" -- it never checks the `profiles` table for `full_name`.

By contrast, the sales rep name resolution (line 312) correctly falls back to `profilesMap.get(data.realUserId)` which pulls `full_name` from profiles.

### Fix

**File: `src/pages/dashboard/AdminOverview.tsx`**

1. **Update canvasser profiles query** (line 396): Add `full_name` to the select:
   - Change `.select('id, is_archived')` to `.select('id, is_archived, full_name')`

2. **Build a canvasser profiles name map** (after line 407): Create a map from canvasser user IDs to their `full_name` from profiles.

3. **Update canvasser name resolution** (line 420): Add profiles fallback:
   - Change from: `data.displayName || 'Unknown Canvasser'`
   - Change to: `data.displayName || (data.realUserId ? canvasserProfilesMap.get(data.realUserId) : null) || 'Unknown Canvasser'`

This ensures that even if `canvasser_metrics.display_name` is null, the system falls back to the profile's `full_name` before showing "Unknown."

### Summary

| File | Change |
|---|---|
| `src/pages/dashboard/AdminOverview.tsx` | Add `full_name` to canvasser profiles query; use it as fallback for canvasser names |

