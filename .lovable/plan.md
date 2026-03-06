

# Add YTD Income Column to Canvasser Performance Table

## Change

**File: `src/pages/dashboard/AdminOverview.tsx`**

In the Canvasser Performance table (line ~1002-1056):

1. **Add "YTD Income" column header** after "Points" and before "Revenue" (line 1011):
   ```
   <th ...>YTD Income</th>
   ```

2. **Add the data cell** after the points cell (line 1042), using the existing `canvasser.income` value which is already fetched and available:
   ```
   <td className="py-3 px-4 text-right text-green-600 dark:text-green-400 font-medium">
     {formatCurrency(canvasser.income)}
   </td>
   ```

This is the `income` field from `canvasser_metrics` that admins manually enter via daily metric entries. The `revenue` column (from quote_requests) stays as-is for future use when `canvasser_id` gets populated on closed deals.

Single file, two lines added.

