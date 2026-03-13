

# Fix: Invalidate Unassigned Canvasser Leads Cache After Deletion

## Problem
When a lead is permanently deleted, the query cache for `unassigned-canvasser-leads` is not invalidated, so deleted leads persist in the "Unassigned Canvasser Leads" widget until a page refresh.

## Fix — `src/pages/admin/LeadDetail.tsx` (line 865)

Add cache invalidation for the `unassigned-canvasser-leads` query key alongside the existing `admin-leads` invalidation:

```typescript
queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
queryClient.invalidateQueries({ queryKey: ["unassigned-canvasser-leads"] });
```

Also invalidate `lead-form-counts-queue` since that's a dependent query used by the widget.

## Files Changed
- `src/pages/admin/LeadDetail.tsx` — add missing cache invalidations after hard delete

