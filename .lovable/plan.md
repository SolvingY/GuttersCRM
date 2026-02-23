

# Restructure Lead Detail Page: Start-to-Finish Flow

## Goal

Reorganize the right column to follow the natural lifecycle of a job from initial contact through completion, and move Files and Activity Log to the bottom above Admin Notes.

## Current Right Column Order

1. Quote Approval
2. Scheduling / Payments / Close Job
3. Follow-up
4. Assignment (admin)
5. Archive (admin)
6. Timeline (includes Won/Lost buttons + loss reason)
7. Admin Notes

## New Right Column Order (chronological lifecycle)

1. **Assignment** (admin) -- first step: assign the lead
2. **Follow-up** -- track outreach attempts
3. **Quote Approval** -- price the job
4. **Won / Lost** -- extracted from Timeline, standalone card right below quote
5. **Scheduling / Payments / Close Job** -- post-win execution
6. **Timeline** -- dates-only reference (Won/Lost buttons removed)
7. **Archive** (admin) -- end-of-life action
8. **Files** -- moved from left column
9. **Activity Log** -- moved from left column
10. **Admin Notes** -- stays last

## Left Column (simplified)

1. Service Details
2. Contact Information
3. Photos
4. Saved Estimates

## File Modified

| File | Change |
|------|--------|
| `src/pages/admin/LeadDetail.tsx` | Reorder right column sections; extract Won/Lost + loss reason into standalone card; move LeadFilesSection and LeadActivityLog from left to right column above Admin Notes |

## Details

- The Won/Lost card will contain the same two buttons and loss reason dropdown currently inside the Timeline section (lines 489-517), wrapped in its own bordered card with an "Outcome" heading
- The Timeline section (lines 444-518) keeps only the date entries, no buttons
- LeadFilesSection (line 329) and LeadActivityLog (line 332) move from left column to right column, inserted between Archive and Admin Notes
- No logic changes -- purely layout reordering

