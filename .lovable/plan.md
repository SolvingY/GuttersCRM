

# Phase 2 & 3: Admin Role Presets + Dashboard Builder

## Phase 2: Admin Role Presets

### Database Changes (2 migrations)

**Migration 1 — `admin_presets` table:**
```sql
CREATE TABLE public.admin_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  default_landing_page text NOT NULL DEFAULT '/admin/overview',
  visible_menu_items jsonb DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.admin_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage presets" ON public.admin_presets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
```

**Migration 2 — Add preset reference to `profiles`:**
```sql
ALTER TABLE public.profiles ADD COLUMN admin_preset_id uuid REFERENCES public.admin_presets(id) ON DELETE SET NULL;
```

### New Files

| File | Purpose |
|------|---------|
| `src/pages/admin/AdminPresets.tsx` | CRUD page to create/edit/delete presets (name, default landing page dropdown, optional menu visibility toggles) |
| `src/components/admin/AssignPresetModal.tsx` | Modal on User Roles page to assign a preset to a user |

### Modified Files

| File | Change |
|------|--------|
| `AdminLayout.tsx` | On mount, read `profiles.admin_preset_id` → fetch preset → redirect to `default_landing_page` if landing on `/admin` root. Optionally filter `adminNavGroups` items based on `visible_menu_items` JSON. |
| `App.tsx` | Add route `<Route path="presets" element={<AdminPresets />} />` inside admin routes |
| `AdminLayout.tsx` nav config | Add "Admin Presets" link under System Settings group |
| `src/pages/admin/UserRoles.tsx` | Add "Assign Preset" button per user row that opens `AssignPresetModal` |

### Preset Examples
- **AP Admin** → lands on `/admin/overview`, sees Pipeline & Revenue + System Settings
- **HR Admin** → lands on `/admin/applicants`, sees Team Operations + Performance & Culture
- **Canvass Manager** → lands on `/admin/timeclock`, sees Team Operations + Performance & Culture

### Routing Logic
In `AdminLayout.tsx` `useEffect`:
1. If user navigates to exactly `/admin` (no sub-path) AND has a preset assigned → `navigate(preset.default_landing_page, { replace: true })`
2. If no preset → default to `/admin/overview` as today

---

## Phase 3: Full Dashboard Builder

### Database Changes

**Migration — `dashboard_layouts` table:**
```sql
CREATE TABLE public.dashboard_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid REFERENCES public.admin_presets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  layout_config jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT one_layout_per_context CHECK (
    (preset_id IS NOT NULL AND user_id IS NULL) OR
    (preset_id IS NULL AND user_id IS NOT NULL)
  )
);
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage layouts" ON public.dashboard_layouts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own layout" ON public.dashboard_layouts FOR SELECT
  USING (user_id = auth.uid());
```

`layout_config` JSON structure:
```json
[
  { "widgetId": "revenue-analytics", "x": 0, "y": 0, "w": 6, "h": 4, "visible": true },
  { "widgetId": "stale-contracts", "x": 6, "y": 0, "w": 6, "h": 4, "visible": true },
  { "widgetId": "leaderboard-sales", "x": 0, "y": 4, "w": 12, "h": 6, "visible": true }
]
```

### Widget Registry

Extract existing AdminOverview sections into standalone widget components:

| Widget ID | Source Component | Description |
|-----------|-----------------|-------------|
| `stats-cards` | StatsCard grid | KPI cards (revenue, leads, deals) |
| `revenue-analytics` | RevenueAnalyticsWidget | Revenue trend charts |
| `stale-contracts` | StaleContractsWidget | Contracts needing attention |
| `collections-pipeline` | CollectionsPipelineWidget | Payment tracking |
| `google-calendar` | GoogleCalendarWidget | Calendar embed |
| `leaderboard-sales` | LeaderboardTable | Sales rep rankings |
| `leaderboard-canvasser` | CanvasserLeaderboardTable | Canvasser rankings |
| `canvasser-funnel` | CanvasserConversionFunnel | Door-to-close funnel |
| `active-contest` | ActiveContestWidget | Current competition |
| `overdue-followups` | OverdueFollowupsWidget | Follow-up alerts |

### New Files

| File | Purpose |
|------|---------|
| `src/lib/widgetRegistry.ts` | Map of widgetId → component, default size, label, icon |
| `src/components/admin/DashboardEditor.tsx` | Drag-and-drop grid editor using `react-resizable-panels`. Shows available widgets, lets admin toggle visibility and reorder. Saves to `dashboard_layouts`. |
| `src/components/admin/DynamicDashboard.tsx` | Reads `layout_config` and renders widgets in a CSS grid according to saved positions |
| `src/pages/admin/DashboardBuilder.tsx` | Page wrapper for the editor, accessible from System Settings |

### Modified Files

| File | Change |
|------|--------|
| `AdminOverview.tsx` | Replace hardcoded widget layout with `<DynamicDashboard />` that reads the user's (or preset's) layout config. Falls back to current layout if no config exists. |
| `AdminLayout.tsx` | Add "Dashboard Builder" to System Settings nav group |
| `App.tsx` | Add route for dashboard builder page |
| `AdminPresets.tsx` | Add "Edit Layout" button per preset that opens the builder for that preset |

### Resolution Order
When rendering a dashboard:
1. Check `dashboard_layouts` for `user_id` match → use personal layout
2. Else check user's `admin_preset_id` → fetch preset's layout
3. Else render default hardcoded layout (current AdminOverview)

---

## Implementation Order

**Phase 2 first** (presets + landing page + menu filtering) — provides the foundation that Phase 3 builds on. Estimated: 1 session.

**Phase 3 second** (widget registry + dynamic dashboard + editor) — the heaviest lift, leveraging `react-resizable-panels` already installed. Estimated: 1-2 sessions.

