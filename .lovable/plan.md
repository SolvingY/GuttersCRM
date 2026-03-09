

# Fix Weekly Updates: Autosave, Date Reload, Sizing, and StatsCard Text

## Problems Identified
1. **No autosave** — if the user accidentally logs out, all entered data is lost (fields are only in local state)
2. **No reload on date change** — scrolling back to a previous day doesn't load previously saved entries from `daily_user_metric_entries` / `daily_canvasser_metric_entries`
3. **StatsCard text truncation** — titles like "Approved Revenue" and "Total Contracts" are cut off with ellipsis; dollar sign on "Approved Revenue" is partially hidden
4. **Accordion sub-button sizing** — the AccordionButton sizes are fine but StatsCards in the grid need better text wrapping on mobile

## Changes

### 1. `src/pages/admin/WeeklyUpdates.tsx` — Autosave + Load Previous Entries

**Load saved entries when date changes:**
- Add a `useEffect` on `selectedDate` that queries `daily_user_metric_entries` and `daily_canvasser_metric_entries` for the selected date
- Pre-populate `weeklyEntries` and `canvasserEntries` with saved values so navigating back to a day shows what was already entered

**Autosave on field blur or after short debounce:**
- Add a `saveDraft` function that upserts to `daily_user_metric_entries` / `daily_canvasser_metric_entries` with the current field values (without compounding into YTD/weekly — that only happens on "Save All")
- Use `onBlur` on each input to trigger a draft save for that user's row
- This means if the user logs out mid-entry, the drafts are persisted and will reload when they come back

**Also store sales rep daily entries:**
- The canvasser path already upserts to `daily_canvasser_metric_entries` on save. The sales rep path does NOT currently write to `daily_user_metric_entries`. Add the same upsert for sales reps on save.

### 2. `src/components/dashboard/StatsCard.tsx` — Fix Text Visibility

- Change `truncate` on the title to `break-words` or remove it, allowing text to wrap
- Ensure the value text (especially currency with `$`) doesn't overflow by using `break-all` or reducing font size on small screens
- Adjust the min-width and padding so the dollar sign is always visible

### 3. `src/pages/dashboard/AdminOverview.tsx` — StatsCard Grid Sizing

- The grid already uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-6` which is correct
- Ensure the StatsCard titles are fully visible by removing `truncate` behavior

## Technical Details

- `daily_user_metric_entries` has columns: `user_id`, `entry_date`, `approved_revenue_delta`, `collections_delta`, `leads_delta`, `closed_deals_delta`, `self_generated_deals_delta`, `canvass_leads_delta`, `canvass_deals_closed_delta`, `earnings_delta`, `entered_by`
- `daily_canvasser_metric_entries` has columns: `user_id`, `entry_date`, `leads_set_delta`, `leads_closed_delta`, `leads_with_damage_delta`, `leads_without_damage_delta`, `conversations_had_delta`, `not_interested_delta`, `cancelled_leads_delta`, `hours_worked_delta`, `doors_knocked_delta`, `income_delta`, `entered_by`
- Both tables have unique constraint on `(user_id, entry_date)` for upsert
- The "Save All" flow should still compound into YTD/weekly as it does now, but should first check if there's already a saved entry for the date and subtract the old values before adding new ones (to prevent double-counting on re-save)

