

# Consolidate Leads into Status-Based Carousel Buttons

## Problem
The Leads page currently uses dropdown filters and a stats bar for status filtering. The user wants the same `SectionCarousel` button pattern used elsewhere — each status becomes a clickable button that shows leads filtered to that category.

## Changes

### `src/pages/admin/Leads.tsx`

1. **Replace the status stats bar (grid of 5 count buttons, lines 144-158) and the status Select dropdown with `SectionCarousel` status buttons.**

   The carousel items will be: **All**, **New**, **Contacted**, **Quoted**, **Scheduled**, **Won**, **Lost**, **Archived** — each showing count in the button label and filtering leads to that status when clicked.

2. **Fetch ALL leads (no status filter in query)** — move status filtering to client-side so counts are always accurate and switching tabs is instant. Keep the other filters (service, priority, source, rep) as server-side query params.

3. **Each `SectionCarousel.Item` renders the filtered lead cards** for that status. The "All" button shows all non-archived leads (current default behavior).

4. **Remove the separate status Select dropdown** from the filters row since it's now handled by the carousel buttons. Keep service, priority, source, and rep filters.

5. **Keep everything else intact**: OverdueFollowupsWidget, Revenue carousel, AutoAssignmentSettings, UnassignedCanvasserQueue, CreateLeadDialog, and the lead card rendering logic.

### Layout Result
```text
Overdue Follow-ups Widget
Revenue from Leads (carousel)
Header + Create/Export buttons
Auto-Assignment Settings
Unassigned Canvasser Queue
[All (12)] [New (3)] [Contacted (2)] [Quoted (4)] ... ← status carousel
Service | Priority | Source | Rep filters (no status dropdown)
Lead cards for selected status
```

