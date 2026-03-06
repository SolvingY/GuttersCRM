

# Fix Lead Detail Layout & Pipeline Funnel Count

## Issues Found

1. **Lead Detail 2-column layout**: The page uses `grid grid-cols-1 lg:grid-cols-5` (line 421), splitting Service/Client Details to the left and lifecycle sections to the right on desktop. User wants everything stacked in a single column.

2. **Pipeline Funnel showing 8 leads**: The `PipelineFunnelWidget` queries ALL `quote_requests` with no status filter — this includes 4 archived leads. The funnel should exclude `archived` status leads. Additionally, the funnel currently has no lead source filter, which the user wants.

## Plan

### File 1: `src/pages/admin/LeadDetail.tsx`
- **Line 421**: Change `grid grid-cols-1 lg:grid-cols-5 gap-6` to `space-y-6` (single stacked column)
- **Line 423**: Remove `lg:col-span-3` wrapper div, just keep the `space-y-6` children
- **Line 470**: Remove `lg:col-span-2` wrapper div, merge children into the same flow
- Essentially flatten the two-column grid into one single stacked column

### File 2: `src/components/dashboard/PipelineFunnelWidget.tsx`
- **Line 49**: Add `.not('status', 'eq', 'archived')` to exclude archived leads from the funnel count
- **Add a Lead Source filter** dropdown (internet, canvasser, self_gen, all) next to the date range filter
- When a source is selected, add `.eq('lead_source', source)` to the query

This will reduce the count from 8 to 4 (the non-archived leads) and allow filtering by lead source.

