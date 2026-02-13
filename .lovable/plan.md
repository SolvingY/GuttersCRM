

## Remove "Next Generation Roofing" Text from Header + Verify Hours Tracker

### Problem
The "Next Generation Roofing" text in the header overlaps onto the navigation menu items on desktop (visible in the screenshot). The text is redundant since the logo already identifies the brand.

### Fix: Header.tsx (lines 118-120)

Remove the text span next to the logo. Change:

```
<img src={logo} alt="Next Generation Roofing" className="h-12 w-12 md:h-14 md:w-14 rounded-full" />
<span className="hidden xl:block font-heading text-lg xl:text-xl font-bold uppercase tracking-wide">
  Next Generation Roofing
</span>
```

To just:

```
<img src={logo} alt="Next Generation Roofing" className="h-12 w-12 md:h-14 md:w-14 rounded-full" />
```

### Hours Tracker Verification

The Canvasser Hours Tracker widget is already correctly implemented in AdminOverview.tsx with:
- Week navigation (Prev/Next buttons with date range display)
- Mon-Sun daily hours grid per canvasser
- Weekly totals column
- Data fetched from `daily_canvasser_metric_entries`

No changes needed for the Hours Tracker -- it is structurally correct.

### Summary

| File | Change |
|---|---|
| `src/components/Header.tsx` | Remove the "Next Generation Roofing" text span (lines 118-120) |

