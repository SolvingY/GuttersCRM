

# Fix Long Hours Number + Sales Rep Prompt on Lead Edit

## Problem 1: Long Numbers
In the "Pay Period Daily Activity" table, hours are displayed as raw floats (e.g. `3.7500000000000004h`) because `{hrs}h` has no rounding. Same for day totals.

**Fix in `AdminTimeClock.tsx`:**
- Line 595: Change `{hrs}h` → `{parseFloat(hrs.toFixed(2))}h`
- Line 624: Change `{dayHrs}h` → `{parseFloat(dayHrs.toFixed(2))}h`

## Problem 2: Prompt for Sales Rep When Adding Leads via Edit Shift
When an admin edits a shift and enters leads (Leads Set > 0), there's no prompt to pick which sales rep ran the lead. Need to add a sales rep attribution step.

**Changes in `AdminTimeClock.tsx`:**

1. **Add state**: `salesReps` (fetched from `user_metrics`), `shiftSalesRepId` for the selected rep, and `repPromptOpen` boolean for a follow-up dialog.

2. **Fetch sales reps on mount**: Query `user_metrics` for `user_id, display_name` to populate the dropdown.

3. **Update `handleSaveEditShift`**: After saving, if `newLeadsSet > 0` and `leadsSetDelta > 0` (leads were added), open a "Select Sales Rep" dialog instead of immediately closing. Store the attribution in `lead_attributions` table with `entry_type: 'canvasser_lead_set'`.

4. **Update `handleAddManualShift`**: Same logic — if leads > 0, prompt for sales rep before finishing.

5. **Add a small "Sales Rep Attribution" dialog**: Shows after edit/add when leads > 0. Has a Select dropdown of sales reps. On confirm, inserts into `lead_attributions` and closes both modals.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminTimeClock.tsx` | Fix hours display rounding; add sales rep prompt when leads are entered |

