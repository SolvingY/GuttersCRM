

## Implementation Plan — AdminTimeClock.tsx Fixes

One file: `src/pages/admin/AdminTimeClock.tsx` (1276 lines). Two fixes.

---

### Fix 1 — Rewrite RoleShiftManagement & ProductionShiftManagement with SectionCarousel

**Move helpers to module level** (before `AdminTimeClock` component):
- Extract `handleCopyCoords` and `renderLocationLink` out of the main component to module-level functions so both sub-components can use them.

**Rewrite `RoleShiftManagement` (lines 1086-1181)**:
Replace flat layout with full SectionCarousel containing 3 sections, each with its own `useState` for `openSection`.

- **Section 1 — Hours Tracker**: 
  - Own `selectedWeek` state (Thu-aligned, same calculation as canvasser tab line 31-35)
  - Fetch users from `user_roles` WHERE `role = props.role` joined to `profiles` (not from metrics tables)
  - Fetch hours from `role_shifts` (cast as `any`) WHERE `role = props.role`, date-filtered to the selected week
  - Group by user_id + date, sum `hours_worked`
  - Display-only grid (no editable cells), same visual styling as canvasser Hours Tracker (table with Thu-Wed columns, prev/next nav, totals row)

- **Section 2 — Shift Management**:
  - Active shifts: `role_shifts` WHERE `role = props.role` AND `clock_out_at IS NULL`
  - Green card styling matching canvasser active shifts (line 737)
  - Show: name, clock-in time, elapsed duration badge, GPS location via `renderLocationLink`
  - Edit button opens an edit modal (clock-in/out times + notes only)
  - Dismiss button: force clock-out (`clock_out_at = now()`, `status = 'completed'`)

- **Section 3 — Shift History**:
  - Date range selector (7/14/30/90 days) + user dropdown filter
  - Columns: Name, Date, Clock In, Clock Out, Hours, Notes, Clock-In location, Clock-Out location, Status, Actions (Edit/Delete)
  - Edit modal: clock-in time, clock-out time, notes only
  - Same table styling as canvasser history (lines 800-850)

The component manages its own state entirely via `useState` — no URL params.

**Rewrite `ProductionShiftManagement` (lines 1186-1276)**:
Same 3-section SectionCarousel pattern but queries `production_shifts` instead of `role_shifts`. Fetches users from `user_roles` WHERE `role = 'production'` joined to `profiles`. Same Hours Tracker, Shift Management, Shift History sections. Own `useState` for `openSection`.

---

### Fix 2 — Make zone assignment modal role-aware

**Changes in main `AdminTimeClock` component**:

1. Add `allTeamMembers` state: `{ userId: string; name: string; role: string }[]`
2. Add `fetchAllTeamMembers` in `useEffect` init: query `profiles` WHERE `is_archived = false OR is_archived IS NULL`, join to `user_roles`, map role labels, sort by `full_name`
3. Role label map: `{ user: 'Sales Rep', canvasser: 'Canvasser', supplementer: 'Supplementer', production: 'Production', office: 'Office', admin: 'Admin' }`

**Zone assignment modal (lines 1039-1060)**:
- Title: `"Assign Team Members — {assigningZone?.name}"`
- Subtitle: `"Select team members who should be restricted to this zone. Leave all unchecked to apply this zone to everyone."`
- Replace `canvassers.map` with `allTeamMembers.map`, show name + muted role badge
- Empty state: `"No team members found."`

**`getZoneAssignmentLabel` (line 484)**: Change `'All canvassers'` to `'All team members'`

**Zone list text (lines 863, 885)**: Update "canvassers" references to "team members"

**Save logic (`handleSaveAssignments`)**: Completely unchanged — still writes to `canvasser_zone_assignments`.

---

### Summary

| Change | Lines Affected |
|--------|---------------|
| Move `handleCopyCoords` + `renderLocationLink` to module level | ~487-508 → before component |
| Add `allTeamMembers` state + fetch | New state + init effect |
| Update `getZoneAssignmentLabel` | Line 484 |
| Update zone assignment modal | Lines 1039-1060 |
| Update zone list labels | Lines 863, 885 |
| Rewrite `RoleShiftManagement` | Lines 1086-1181 |
| Rewrite `ProductionShiftManagement` | Lines 1186-1276 |

