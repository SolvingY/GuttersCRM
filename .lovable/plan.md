

# Fix Contract Scope of Work and Status Dropdown Order

## Change 1: Contract Scope of Work (GutterContract.tsx)

**Problem:** Scope shows raw footage like `335ft 5" gutters, 0ft Hydro Flow Mesh + Frame` instead of matching the estimate PDF format.

**Fix:** Replace lines 99-110 in `src/pages/dashboard/forms/GutterContract.tsx` with logic that mirrors `generateEstimatePDF.ts`:

- Build gutter label: `{gutterSize} {colorLabel} Gutters & {dsDisplaySize} Downspouts — $X,XXX.00`
- Add protection as a separate line if footage > 0: `Hydro Flow Mesh + Frame — $X,XXX.00`
- Use estimate fields: `gutter_size`, `gutter_color`, `measurement_data.dsType`, `measurement_data.gutterDsQuoted`, `measurement_data.protQuoted`
- Color label: "Premium" if `gutter_color === "Premium (+$2/ft)"`, else "Standard"
- Downspout size: "3x4" if `dsType === '3x4 (= 6")'`, else "2x3"
- Fall back to `md.description` if no gutter footage exists

## Change 2: Status Dropdown Order (LeadDetailView.tsx)

**Fix:** Change line 28 from:
```
["new", "contacted", "quoted", "scheduled", "won", "lost", "completed"]
```
To:
```
["new", "contacted", "quoted", "won", "lost", "scheduled", "completed"]
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/dashboard/forms/GutterContract.tsx` | Rewrite scope-of-work generation (lines 99-110) to match estimate PDF format |
| `src/pages/dashboard/LeadDetailView.tsx` | Reorder status dropdown (line 28) |

