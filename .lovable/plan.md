

# Canvasser "My Leads" + Cache Fix + Approved UI Changes

## Changes

### 1. Fix: Invalidate unassigned canvasser leads cache after deletion
**`src/pages/admin/LeadDetail.tsx`** (line 865):
- Add `queryClient.invalidateQueries({ queryKey: ["unassigned-canvasser-leads"] })` after the existing `admin-leads` invalidation so deleted leads disappear immediately from that widget.

### 2. Add "My Leads" page for canvassers
Create a new page `src/pages/canvasser/CanvasserMyLeads.tsx` that:
- Queries `quote_requests` where `canvasser_id = user.id` (leads they SET, not leads assigned to them as a sales rep)
- Shows lead cards with status, service type, client name, phone, city, and created date
- Includes a status filter dropdown
- Links each card to the canvasser lead detail view (read-only, or to `/dashboard/leads/:id` if they have sales access)
- Header says "My Leads" with subtitle "Leads you've set"
- No "Create Lead" button here since that already exists in the sidebar nav

### 3. Add route for canvasser My Leads
**`src/App.tsx`** (line 204):
- Add lazy import for `CanvasserMyLeads`
- Add route `<Route path="my-leads" element={<CanvasserMyLeads />} />` inside the canvasser route group

### 4. Add sidebar nav item
**`src/components/canvasser/CanvasserSidebar.tsx`** (line 8, navItems array):
- Add `{ icon: ClipboardList, label: "My Leads", path: "/canvasser/my-leads" }` after the "Create Lead" item
- Import `ClipboardList` from lucide-react

## Files Changed
- `src/pages/admin/LeadDetail.tsx` — add cache invalidation for unassigned-canvasser-leads
- `src/pages/canvasser/CanvasserMyLeads.tsx` — new page querying by `canvasser_id`
- `src/App.tsx` — add lazy import and route
- `src/components/canvasser/CanvasserSidebar.tsx` — add nav item

