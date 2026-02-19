

# Implementation Plan: 3 Fixes + Editable Estimates

## Fix 1: Tools Tab in Supplementer Sidebar

**File:** `src/components/supplementer/SupplementerSidebar.tsx`

- Add `Wrench` to the lucide-react import (line 2)
- Add `{ icon: Wrench, label: "Tools", path: "/dashboard/tools" }` after the "Jobs" item in the navItems array (after line 9)

No other changes needed -- `ProtectedRoute.tsx` already has the `isToolsRoute` exception (lines 46-57), `CanvasserSidebar.tsx` and `DashboardSidebar.tsx` already have Tools, and the `/dashboard/tools` routes are under the generic `ProtectedRoute` wrapper (no `requireAdmin`).

## Fix 2: Retail/Floor/Commission Info Bar Below Product Pills

**File:** `src/components/NGRGutterCalculator.tsx`

Insert a pricing info bar in two places:

**A. Protection tab** (after the SelectPill on line 436, before the Measurements SubHeader on line 439):

```tsx
<div style={{ background: "#0a1120", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 24, flexWrap: "wrap" }}>
  <div><span style={{ color: "#4a5878", fontSize: 12 }}>Retail/ft: </span><span style={{ color: "#e8eaf0", fontWeight: 700 }}>${protPrices.retail}</span></div>
  <div><span style={{ color: "#4a5878", fontSize: 12 }}>Floor/ft: </span><span style={{ color: "#ffa726", fontWeight: 700 }}>${protPrices.floor}</span></div>
  <div><span style={{ color: "#4a5878", fontSize: 12 }}>Commission/ft: </span><span style={{ color: "#66bb6a", fontWeight: 700 }}>${protPrices.retail - protPrices.floor}</span></div>
</div>
```

**B. Gutters tab** (after the Size/Color SelectPills closing div on line 465, before the Gutter Measurements SubHeader on line 467):

```tsx
<div style={{ background: "#0a1120", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 24, flexWrap: "wrap" }}>
  <div><span style={{ color: "#4a5878", fontSize: 12 }}>Retail/ft: </span><span style={{ color: "#e8eaf0", fontWeight: 700 }}>${gutterEffRetail}</span></div>
  <div><span style={{ color: "#4a5878", fontSize: 12 }}>Floor/ft: </span><span style={{ color: "#ffa726", fontWeight: 700 }}>${gutterEffFloor}</span></div>
  <div><span style={{ color: "#4a5878", fontSize: 12 }}>Commission/ft: </span><span style={{ color: "#66bb6a", fontWeight: 700 }}>${gutterEffRetail - gutterEffFloor}</span></div>
</div>
```

Both render unconditionally and update instantly since the values are derived from state.

## Fix 3: Saved Estimates -- Open & Edit

### A. Add `existingEstimate` prop + upsert to `NGRGutterCalculator.tsx`

**Interface change:** Add optional `existingEstimate` prop:
```tsx
interface NGRGutterCalculatorProps {
  lead?: LeadProp | null;
  onSave?: (estimate: Record<string, unknown>) => void;
  existingEstimate?: any;
}
```

**New state:** Add `estimateId`:
```tsx
const [estimateId, setEstimateId] = useState<string | null>(existingEstimate?.id || null);
```

**New useEffect:** Restore state from `existingEstimate`:
```tsx
useEffect(() => {
  if (!existingEstimate) return;
  const d = existingEstimate.measurement_data as any;
  if (d.protProduct) setProtProduct(d.protProduct);
  if (d.protRows) setProtRows(d.protRows);
  if (d.gutterSize) setGutterSize(d.gutterSize);
  if (d.gutterColor) setGutterColor(d.gutterColor);
  if (d.gutterRows) setGutterRows(d.gutterRows);
  if (d.downspouts) setDownspouts(d.downspouts);
  if (d.elbows) setElbows(d.elbows);
  if (d.addons) setAddons(d.addons);
  if (d.quotedTotal !== undefined) setQuotedTotal(d.quotedTotal);
  if (d.dsType) setDsType(d.dsType);
  setJobInfo({
    customer: existingEstimate.customer_name || "",
    city: existingEstimate.city || "",
    state: existingEstimate.state || "",
    jobNumber: existingEstimate.job_number || "",
  });
}, [existingEstimate?.id]);
```

**Update `measurement_data` in handleSave** to include ALL state:
```tsx
measurement_data: JSON.stringify({ protProduct, protRows, gutterSize, gutterColor, gutterRows, downspouts, elbows, addons, quotedTotal, dsType }),
```

**Change handleSave to use upsert:**
```tsx
const payload = { ...estimatePayload, ...(estimateId ? { id: estimateId } : {}) };
const { data, error } = await supabase
  .from("gutter_estimates")
  .upsert(payload as any, { onConflict: "id" })
  .select("id")
  .single();
if (error) throw error;
if (data?.id) setEstimateId(data.id);
```

**Update save button label:**
```tsx
{saving ? "Saving..." : estimateId ? "Update Estimate" : "Save Estimate"}
```

### B. Update `LeadDetailView.tsx` -- "Open & Edit" button

Add `editingEstimate` state and pass it to the calculator:

```tsx
const [editingEstimate, setEditingEstimate] = useState<any>(null);
```

When "Open & Edit" is clicked, set `editingEstimate` and show calculator. Pass it:
```tsx
<NGRGutterCalculator
  lead={{ id: lead.id, full_name: lead.full_name, ... }}
  existingEstimate={editingEstimate}
  onSave={() => { setShowCalculator(false); setEditingEstimate(null); refetchEstimates(); }}
/>
```

Add "Open & Edit" button to each estimate card. Add a "Back to Lead" button at the top of the calculator view.

### C. Update `GutterEstimator.tsx` -- Read from location.state

```tsx
import { useLocation } from "react-router-dom";
const location = useLocation();
const existingEstimate = (location.state as any)?.existingEstimate || null;
// Pass to calculator:
<NGRGutterCalculator existingEstimate={existingEstimate} />
```

### D. New file: `src/pages/dashboard/MyEstimates.tsx`

- Query `gutter_estimates` where `lead_id IS NULL` and `created_by = user.id`
- Display table with columns: Date (MM/DD/YYYY), Customer Name, Quoted Price, Commission, Actions
- "Open & Edit" button navigates to `/dashboard/tools/estimator` with `state: { existingEstimate: estimate }`
- Red NGR-branded empty state with link to `/dashboard/tools/estimator`

### E. Update `ToolsHub.tsx` -- Add "My Estimates" card

Add second tool card:
- Icon: `FileText` from lucide-react
- Title: "My Estimates"
- Description: "View and edit your previously saved standalone estimates"
- Navigates to `/dashboard/tools/my-estimates`

### F. Update `App.tsx` -- Add route

Add: `<Route path="tools/my-estimates" element={<MyEstimates />} />`

## Files Summary

| Type | File | Change |
|---|---|---|
| Modified | `src/components/supplementer/SupplementerSidebar.tsx` | Add Wrench + Tools nav item |
| Modified | `src/components/NGRGutterCalculator.tsx` | Price info bars, existingEstimate prop, full measurement_data, upsert, dynamic save label |
| Modified | `src/pages/dashboard/LeadDetailView.tsx` | Open & Edit button, editingEstimate state, back-to-lead button |
| Modified | `src/pages/dashboard/GutterEstimator.tsx` | Read existingEstimate from location.state |
| Modified | `src/pages/dashboard/ToolsHub.tsx` | Add My Estimates card |
| Modified | `src/App.tsx` | Add tools/my-estimates route |
| New | `src/pages/dashboard/MyEstimates.tsx` | Standalone estimates list page |

