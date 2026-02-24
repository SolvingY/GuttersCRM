

# Fix: "Won" Status Unchecked When Selecting "Scheduled"

## Problem

The Outcome section checks `lead.status === "won"` to show the "Won on" date and to hide the Won/Lost/Cancelled buttons. When status progresses to "scheduled" or "completed", the status is no longer "won" even though `won_at` is set, so:
- The "Won on" message disappears
- The Won/Lost/Cancelled buttons reappear (making it look like Won was unchecked)

## Fix

Update the Outcome section conditions in both views to treat "scheduled" and "completed" as post-won statuses:

1. Show "Won on" message when `lead.won_at` exists (regardless of current status being "won", "scheduled", or "completed")
2. Hide the Won/Lost/Cancelled buttons when status is any of: "won", "scheduled", "completed", "lost", "cancelled"

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/dashboard/LeadDetailView.tsx` | Line 363: Change `lead.status === "won" && lead.won_at` to `["won", "scheduled", "completed"].includes(lead.status) && lead.won_at`. Line 378: Change the exclusion list from `["won", "lost", "cancelled"]` to `["won", "scheduled", "completed", "lost", "cancelled"]`. |
| `src/pages/admin/LeadDetail.tsx` | Line 466: Same change -- show "Won on" for won/scheduled/completed statuses. Line 481: Same change -- hide buttons for won/scheduled/completed/lost/cancelled. |

This ensures that once a lead is marked "Won", progressing to "Scheduled" or "Completed" continues to show the won state and keeps the outcome buttons hidden.

