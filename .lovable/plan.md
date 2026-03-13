

# Fix: Lead Form Data Not Displaying Properly for Canvasser-Submitted Leads

## Problem

When a canvasser submits a lead, the `form_data` JSONB field contains nested objects (e.g., `roofing: {...}`, `roofingAppointment: {...}`). The `renderFormData()` function in the Lead Detail page uses `String(value)` to display all values, which renders nested objects as `[object Object]` instead of showing the actual data. This is visible in the screenshot where "Roofing" and "Roofing Appointment" both show `[object Object]`.

## Fix — `src/pages/admin/LeadDetail.tsx`

Update the `renderFormData()` function (lines 222-238) to handle nested objects and arrays properly:

1. For **primitive values** (string, number, boolean) — render as-is with `String(value)`
2. For **arrays** — join with commas (already handled but only at top level)
3. For **objects** (like `roofing` qualification data, `roofingAppointment`) — recursively render key-value pairs in a nested, indented format showing each sub-field on its own line

The rendering logic will:
- Detect when a value is a plain object (`typeof value === 'object' && !Array.isArray(value)`)
- Render its entries as a nested list with human-readable labels (converting camelCase keys to spaced words)
- Handle deeply nested objects (e.g., roofing data has sub-objects for materials, damage type, etc.)
- Skip empty/null values to keep the display clean

## Files Changed
- `src/pages/admin/LeadDetail.tsx` — update `renderFormData()` to recursively display nested objects

