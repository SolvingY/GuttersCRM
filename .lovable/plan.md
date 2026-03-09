

# Fix: "Complete" Status Mismatch

## Problem
The database and lead detail pages use `"completed"` as the status value, but the Leads page carousel config uses `"complete"`. This means `getLeadsForStatus("complete")` never matches any leads, so the count is always 0.

## Fix — `src/pages/admin/Leads.tsx`

Change three references from `"complete"` to `"completed"`:

1. **`statusColors`**: rename the `complete` key to `completed`
2. **`statusCarouselConfig`**: change the entry `id` from `"complete"` to `"completed"`, keep label as "Complete"

That's it — one-line fixes in two places. The filtering and counting logic already uses the `id` from the config, so once the id matches the actual database value, counts and filtering will work correctly.

