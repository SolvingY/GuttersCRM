

## Fix: Double Timezone Conversion in Canvasser EOD Report

### Problem
The footer timestamp shows ~5 hours behind actual Central Time because the code converts UTC→CT twice:
1. Creates `chicagoDate` by parsing a CT-formatted string back into a Date (which JS interprets as UTC)
2. Then applies `timeZone: "America/Chicago"` again when formatting that date

### Solution
Use `now` (the raw UTC Date) directly with `toLocaleTimeString("en-US", { timeZone: "America/Chicago" })` — this does a single, correct conversion.

### Changes

**`supabase/functions/send-canvasser-eod-report/index.ts`**

1. Keep `now = new Date()` as the single source of truth
2. Generate `todayStr` and `reportDateFormatted` directly from `now` with timezone formatting (no intermediate `chicagoDate` object)
3. Use `now.toLocaleTimeString(...)` with `timeZone: "America/Chicago"` for the footer timestamp

Specifically:
- Replace line 23-25 — derive `todayStr` using `now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })` (gives yyyy-MM-dd format)
- Replace line 210 — use `now.toLocaleTimeString(...)` instead of `chicagoDate.toLocaleTimeString(...)`
- Remove the `chicagoDate` variable entirely, replace all references with direct `now` + timezone formatting

