

## Build Personalized Shortcut System on /admin/home

### Current State

- **Home nav item**: Already present in desktop sidebar (collapsed + expanded). **Missing from mobile drawer** (lines 533-547) -- needs fix.
- **Database**: `admin_dashboard_preferences` exists with columns: `id`, `user_id`, `widget_config`, `updated_at`. No `pinned_shortcuts` column yet.
- **Existing hook**: `useAdminDashboardPreferences.ts` manages widget visibility -- will NOT be touched.

### Implementation Steps

**1. Fix mobile nav -- Add Home item to mobile drawer**
In `AdminLayout.tsx` lines 533-547, insert a Home NavLink above the existing Scoreboard NavLink in the mobile sidebar. Same pattern, same styling.

**2. Database migration**
```sql
ALTER TABLE public.admin_dashboard_preferences
  ADD COLUMN IF NOT EXISTS pinned_shortcuts jsonb NOT NULL DEFAULT '[]';
```

**3. Create `src/lib/shortcutRegistry.ts`**
Export `SHORTCUT_REGISTRY` array (18 entries with corrected icons) and `DEFAULT_SHORTCUTS` (6 defaults). Exact content as specified in the prompt.

**4. Create `src/hooks/useAdminShortcutPreferences.ts`**
New hook that reads/writes `pinned_shortcuts` from `admin_dashboard_preferences`. Uses `as any` casts for the new column. Falls back to `DEFAULT_SHORTCUTS` when no saved data exists.

**5. Create `src/components/admin/AdminShortcutPanel.tsx`**
- Header row: "Quick Access" + Settings2 "Edit Shortcuts" button
- Grid: `grid-cols-2 md:grid-cols-3`, 88px cards with icon + label
- Uses `icons` map from `lucide-react` for dynamic icon rendering
- Loading: 6 skeleton cards. Empty: dashed placeholder message.
- Cards navigate via `useNavigate`. Unknown IDs silently skipped.

**6. Create `src/components/admin/ShortcutPickerDrawer.tsx`**
- Right-side `Sheet` (matching existing `DashboardSettingsDrawer` pattern)
- Shortcuts grouped by `group` field with muted section headers
- Checkboxes, 6-item cap with disabled+tooltip at limit
- Local state; Save button persists + toast; Reset sets defaults + toast

**7. Replace `src/pages/admin/AdminHome.tsx`**
Wire up `useAdminShortcutPreferences`, `AdminShortcutPanel`, and `ShortcutPickerDrawer`.

### Files

| File | Action |
|------|--------|
| `src/pages/admin/AdminLayout.tsx` | Add Home to mobile nav (1 insertion) |
| DB migration | Add `pinned_shortcuts` column |
| `src/lib/shortcutRegistry.ts` | New |
| `src/hooks/useAdminShortcutPreferences.ts` | New |
| `src/components/admin/AdminShortcutPanel.tsx` | New |
| `src/components/admin/ShortcutPickerDrawer.tsx` | New |
| `src/pages/admin/AdminHome.tsx` | Replace placeholder |

**Not touched**: `useAdminDashboardPreferences.ts`, `AdminOverview.tsx`, any other existing file.

