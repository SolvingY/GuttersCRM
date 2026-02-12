

## Fix Mobile Layout Wrapping on Leads Page

### Issues Identified from Screenshot

1. **Header row**: "LEAD MANAGEMENT" title and "Create Lead" / "Export" buttons are side-by-side with `justify-between`, causing the buttons to overflow and the title to get clipped on mobile.
2. **Stats bar**: Uses `grid-cols-2 sm:grid-cols-5`, so on mobile the 5th card ("Won") sits alone on a third row, looking unbalanced.
3. **Filter dropdowns**: Fixed widths (`w-[140px]`, `w-[160px]`, `w-[180px]`) cause horizontal overflow on narrow screens.

### Changes (1 file: `src/pages/admin/Leads.tsx`)

**1. Header section** -- Stack title and buttons vertically on mobile:
- Change the container from `flex items-center justify-between` to `flex flex-col sm:flex-row sm:items-center justify-between gap-3`
- This stacks the title above the buttons on small screens and places them side-by-side on larger screens

**2. Stats bar** -- Show all 5 in a scrollable row or use a mobile-friendly grid:
- Change from `grid-cols-2 sm:grid-cols-5` to `grid-cols-5` with smaller padding on mobile, so all 5 stats stay in one row
- Reduce padding to `p-2 sm:p-3` and font size to `text-xl sm:text-2xl` so they fit

**3. Filter dropdowns** -- Make them responsive:
- Change fixed widths to `w-full sm:w-[140px]` (and similar for others) so filters stack full-width on mobile
- Alternatively, change the flex-wrap container to a grid: `grid grid-cols-2 sm:flex sm:flex-wrap gap-3`

### Technical Details

All changes are in `src/pages/admin/Leads.tsx`:

- **Lines 107-118** (header): Wrap with `flex-col sm:flex-row` and add `gap-3`
- **Lines 125, 135-136** (stats grid): Change to `grid-cols-5 gap-2 sm:gap-3`, reduce text size on mobile
- **Lines 142-190** (filters): Change container to `grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3` and update trigger widths to be responsive (`w-full sm:w-[140px]`)

