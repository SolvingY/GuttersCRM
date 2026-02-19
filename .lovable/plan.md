
# Gutter Calculator Enhancements - 7 Changes + Role Visibility

## Overview

Apply 7 enhancements to the calculator component plus add Tools tab visibility for all dashboard roles (canvassers, sales reps, supplementers, admins).

---

## 1. Color Scheme Update

**File:** `src/components/NGRGutterCalculator.tsx`

Replace all `#4fc3f7` (teal) references throughout:
- Job Info section header accent: `#e53935`
- Auto-filled lead banner: `#e53935` tint
- Gutters section header accent: `#e53935`
- Gutter Size / Color pill accent props: remove `accent="#4fc3f7"`, use default `#e53935`
- Row totals footage color (line 173): `#4fc3f7` -> `#e53935`
- Downspout footage column header/values: `#4fc3f7` -> `#e53935`
- DS TOTAL footage: `#4fc3f7` -> `#e53935`
- Gutter section summary footage stat: `#4fc3f7` -> `#e53935`
- Gutters Section Total footage stat: `#4fc3f7` -> `#e53935`
- Summary header "Quoted" column: `#4fc3f7` -> `#ffffff`
- SummaryRow quoted price color (line 194): `#4fc3f7` -> `#ffffff`
- "ADJUST QUOTED PRICE" heading: `#4fc3f7` -> `#ffffff`
- Quoted price input border and text: `#4fc3f7` -> `#ffffff`
- Keep: Floor `#ffa726`, Commission `#66bb6a`, backgrounds unchanged

---

## 2. Real-Time Per-Row Pricing

**File:** `src/components/NGRGutterCalculator.tsx`

Modify `MeasurementTable` to accept `baseRetail` and `baseFloor` props. Add two columns after "Row Total":
- **Row Retail**: Per-row calculation using `footage * baseRetail + weightedUp * STORY_UPCHARGE`
- **Row Floor**: Same formula with `baseFloor`

Update callers of `MeasurementTable` in Protection and Gutters tabs to pass the appropriate base prices (including premium color upcharge for gutters).

Add a Commission stat bar to section summaries: `sectionRetail - sectionFloor`.

---

## 3. Print Customer Quote - Hide Internal Pricing

**File:** `src/components/NGRGutterCalculator.tsx`

Expand `@media print` CSS:
```css
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  body { background: white !important; color: #111 !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

Add `.print-only` block (hidden on screen, visible on print) with:
- NGR logo at 100x100px centered
- "Next Generation Guttering -- Estimate" heading
- Customer name, city, state, job number

Add `className="no-print"` to:
- "Rep Estimating Calculator -- 2026 Pricing" subtitle
- Floor column in summary header and SummaryRow
- Commission column in summary header and SummaryRow  
- The slider section (already has it)
- Action buttons (already has it)
- Floor stat bars in section summaries
- Commission stat bars

Modify `SummaryRow` to wrap floor and commission spans with `className="no-print"` spans, and adjust the print grid to hide those columns.

---

## 4. NGR Logo in Header

**File:** `src/components/NGRGutterCalculator.tsx`

Import the logo:
```tsx
import ngrLogo from "@/assets/ngr-logo-circle.jpg";
```

Replace the red "NG" circle div (line 358) with:
```tsx
<img src={ngrLogo} alt="NGR" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
```

In the print-only header, show the logo at 100x100px centered.

---

## 5. Standalone Save + Toast Feedback

**File:** `src/components/NGRGutterCalculator.tsx`

- Import `toast` from `sonner`
- Replace `alert("Save failed...")` with `toast.error("Save failed: " + err.message)`
- Replace `setSaved(true)` success flow with `toast.success("Estimate saved successfully!")`
- Ensure `lead_id: null` is explicitly set when no lead prop

---

## 6. Rename to "Tools" Tab

### New file: `src/pages/dashboard/ToolsHub.tsx`

A responsive card grid page. First card:
- Title: "Gutter Estimator"
- Description: "Calculate gutter protection, gutters, downspouts & add-ons with live commission tracking"
- Icon: Calculator from lucide-react
- Red accent border/highlight
- Clicks navigate to `/dashboard/tools/estimator`
- Uses Tailwind classes, responsive 1-2-3 column grid

### Modified: `src/components/dashboard/DashboardSidebar.tsx`
- Replace `Calculator` import with `Wrench`
- Replace nav item: `{ icon: Wrench, label: 'Tools', path: '/dashboard/tools' }`
- Update `isActive` to use `location.pathname.startsWith('/dashboard/tools')`

### Modified: `src/components/canvasser/CanvasserSidebar.tsx`
- Add `Wrench` import
- Add nav item: `{ icon: Wrench, label: "Tools", path: "/dashboard/tools" }` -- canvassers navigate to the same dashboard tools routes

### Modified: `src/App.tsx`
- Replace `<Route path="estimator" ...>` with:
  - `<Route path="tools" element={<ToolsHub />} />`
  - `<Route path="tools/estimator" element={<GutterEstimator />} />`

### Modified: `src/pages/dashboard/GutterEstimator.tsx`
- Add a back link to `/dashboard/tools`

### Role Access
The `/dashboard` route uses `<ProtectedRoute>` without `requireAdmin`, `requireCanvasser`, or `requireSupplementer` -- it allows all authenticated users. The canvasser redirect in `ProtectedRoute` only fires for canvasser-ONLY users (line 54: `isCanvasser && location.pathname.startsWith('/dashboard')`). Since canvassers access the tools via `/dashboard/tools`, we need to ensure canvasser-only users are NOT redirected away from `/dashboard/tools/*`.

**Modified: `src/components/auth/ProtectedRoute.tsx`**
- Add exception: canvasser-only users can access `/dashboard/tools` routes without being redirected to `/canvasser`
- Similarly, supplementer-only users can access `/dashboard/tools` without redirect

---

## 7. Summary Row Fix (Division by Zero)

**File:** `src/components/NGRGutterCalculator.tsx`

Fix operator precedence on lines 572-575. Change all instances of:
```
clampedQuoted / totalRetail || 0
```
to:
```
clampedQuoted / (totalRetail || 1)
```

This prevents `NaN` from division by zero and ensures proportional values display correctly as soon as footage is entered.

---

## Files Summary

| Type | File | Description |
|---|---|---|
| New | `src/pages/dashboard/ToolsHub.tsx` | Tools hub page with card grid |
| Modified | `src/components/NGRGutterCalculator.tsx` | Colors, per-row pricing, print CSS, logo, toast, summary fix |
| Modified | `src/components/dashboard/DashboardSidebar.tsx` | Wrench icon, "Tools" nav item with startsWith active check |
| Modified | `src/components/canvasser/CanvasserSidebar.tsx` | Add Tools nav item pointing to /dashboard/tools |
| Modified | `src/components/auth/ProtectedRoute.tsx` | Allow canvasser/supplementer-only users to access /dashboard/tools |
| Modified | `src/App.tsx` | Replace estimator route with tools + tools/estimator |
| Modified | `src/pages/dashboard/GutterEstimator.tsx` | Add back link to Tools Hub |
