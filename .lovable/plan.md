

# Fix Ad Spend Month Matching and Display

## Root Cause

Two bugs:

1. **MonthKey mismatch**: The fiscal year starts Dec **15**, so `addMonths(fiscalStart, i)` generates keys like `"2025-12-15"`, `"2026-01-15"`, etc. But the DB stores months as `"2025-12-01"`, `"2026-01-01"`. The `.find()` never matches, so YTD always shows $0.

2. **Timezone display bug**: `new Date("2026-02-01")` parses as UTC midnight, which in US timezones becomes Jan 31 — showing the wrong month name in the Recent History list and the month dropdown.

## Changes

### `src/pages/admin/CompanyGoals.tsx`
- **Line 99-100**: Wrap `addMonths(fiscalStart, i)` with `startOfMonth()` so the monthKey becomes `"2025-12-01"`, `"2026-01-01"`, etc., matching the DB format.
  ```ts
  const monthDate = startOfMonth(addMonths(fiscalStart, i));
  ```

### `src/components/admin/AdSpendDialog.tsx`
- **Line 56**: Fix history pre-fill matching to normalize DB month strings: `h.month?.substring(0, 10) === selectedMonth`
- **Line 121**: Fix display of month names to avoid timezone shift: `format(new Date(h.month + 'T00:00:00'), "MMMM yyyy")` to force local-time parsing

| File | Change |
|------|--------|
| `CompanyGoals.tsx` | Wrap monthDate with `startOfMonth()` so keys match DB |
| `AdSpendDialog.tsx` | Fix timezone parsing for display + normalize month comparison |

