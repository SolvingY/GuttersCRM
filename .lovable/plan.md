

# Add Edit Button to Shift History

## Problem
Completed shifts in the "Shift History with Location" table have no Edit button. Admins can only edit active/flagged shifts, not already-logged ones.

## Changes

### File: `src/pages/admin/AdminTimeClock.tsx`

**1. Add state for extra shift fields**
Add state variables for `shiftConvos`, `shiftNotInterested`, and `shiftLeadsSet` alongside the existing `shiftDoors` and `shiftNotes` state (around line 48).

**2. Update `handleEditShift` to populate all fields**
When opening the edit modal, also populate conversations_had, not_interested, and leads_set from the shift data.

**3. Update `handleSaveEditShift` to handle all metric deltas**
Currently only passes `hoursDelta` and `doorsDelta` to `updateCanvasserHours`. Update to also compute and pass `convosDelta`, `notInterestedDelta`, and `leadsSetDelta`. Also save conversations_had, not_interested, and leads_set to the shift row.

**4. Add an "Actions" column to the Shift History table**
- Add a new `<th>` header for "Actions" (line ~668)
- Add a new `<td>` in each row with an "Edit" button that calls `handleEditShift(shift)` (line ~693)

**5. Expand the Edit Shift Modal**
Add input fields for Conversations Had, Not Interested, and Leads Set below the existing Doors Knocked field (around line 807).

**6. Reset new state fields**
Clear `shiftConvos`, `shiftNotInterested`, `shiftLeadsSet` when closing modals or after saving, same as existing `shiftDoors`/`shiftNotes` cleanup.

**7. Update Add Manual Shift flow**
Also add Conversations, Not Interested, and Leads Set fields to the Add Manual Shift modal and pass them through to `updateCanvasserHours`.

## Summary

| Area | Change |
|------|--------|
| Shift History table | Add "Actions" column with Edit button per row |
| Edit Shift modal | Add Conversations, Not Interested, Leads Set fields |
| Save logic | Compute deltas for all 5 metrics, update shift row + 3-tier metrics |
| Add Manual Shift modal | Add same extra fields for consistency |

