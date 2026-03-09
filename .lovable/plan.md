

# Add Task List to Production Daily Activity Log

## What's Changing
Add a dynamic task list to the Daily Activity Log so production contractors can itemize what they accomplished (e.g., "Installed shingles at 123 Main St", "Completed water test at 456 Oak"). This sits alongside the existing "Summary / Notes" textarea.

## Database Migration

Add a `tasks_completed` JSONB column to `production_daily_logs`:

```sql
ALTER TABLE production_daily_logs
  ADD COLUMN IF NOT EXISTS tasks_completed jsonb NOT NULL DEFAULT '[]';
```

Format: `[{"text": "Installed roof at 123 Main St"}, {"text": "Ran water test at 456 Oak Ave"}]`

## UI Changes — `ProductionDashboard.tsx`

Add a task list section between "Builds Completed Today" and "Summary / Notes":

- **Label:** "Tasks Accomplished"
- **Input row:** Text input + "Add" button. Pressing Enter or clicking Add appends to a local state array.
- **List below:** Each task shown as a row with the text and a remove (X) button.
- On submit, `tasks_completed` is included in the upsert payload as a JSON array.
- On load (existing log for today), pre-populate the task list from `tasks_completed`.

## EOD Email Update — `send-production-eod-summary/index.ts`

Add a "Tasks Accomplished" section to the HTML email template, rendering the task list as a bulleted list per contractor. Only shown if the array is non-empty.

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `tasks_completed` jsonb column |
| `src/pages/production/ProductionDashboard.tsx` | Add task list UI with add/remove, include in upsert |
| `supabase/functions/send-production-eod-summary/index.ts` | Render tasks in email HTML |

