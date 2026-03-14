

# Remove Contracts Column from Canvasser EOD Report

## Problem
The "Contracts" column in the emailed canvasser EOD report always sums to 0 because canvassers don't track contracts — "Closed" already captures the relevant metric. The column is redundant noise.

## Solution
Remove the "Contracts" column from the email report table, the team totals summary, and the per-row data in the `send-canvasser-eod-report` edge function.

## Changes — `supabase/functions/send-canvasser-eod-report/index.ts`

1. Remove `contracts` from the data aggregation (the `contracts_delta` sum around line 127)
2. Remove `contracts` from the `canvasserData.push()` call (line 180)
3. Remove the `totalContracts` calculation (line 191)
4. Remove the `<th>Contracts</th>` header from the table (around line 214)
5. Remove the `<td>${c.contracts}</td>` cell from each row (around line 211)
6. Remove the "Contracts" row from the Team Totals section (around line 240)

No UI or database changes needed — this is purely an edge function update.

