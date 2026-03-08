

# Add Google Calendar Embed Widget to All Dashboards

## Overview
Create a shared Google Calendar widget component and an admin settings page to configure the embed URL. The widget will appear on all four dashboard types (Sales Rep, Canvasser, Supplementer, Admin).

## Database Change
Create an `app_settings` table (single-row key-value config) to store the Google Calendar embed URL. This avoids hardcoding and lets admins update it anytime.

```sql
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can read settings"
  ON public.app_settings FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update
CREATE POLICY "Admins can manage settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

## New Components

### 1. `src/components/dashboard/GoogleCalendarWidget.tsx`
- Collapsible card with a Calendar icon header
- Fetches `google_calendar_embed_url` from `app_settings`
- If URL exists: renders an `<iframe>` with the embed URL (responsive, ~400px height)
- If no URL: shows a muted message ("No team calendar configured" — admins see a link to settings)
- Reusable across all dashboards

### 2. Admin Settings for Calendar URL
- Add a "Team Calendar" section to `src/pages/admin/ReportSettings.tsx` (or a new general settings page)
- Simple input field for the Google Calendar embed URL with a Save button
- Upserts to `app_settings` with key `google_calendar_embed_url`

## Integration Points
Add `<GoogleCalendarWidget />` to these pages as a collapsible section at the bottom:

1. **`src/pages/dashboard/MyStats.tsx`** — after the last collapsible section
2. **`src/pages/canvasser/CanvasserStats.tsx`** — after existing widgets
3. **`src/pages/supplementer/SupplementerDashboard.tsx`** — after existing widgets
4. **`src/pages/dashboard/AdminOverview.tsx`** — after existing widgets

## File Summary
| File | Change |
|------|--------|
| Migration | Create `app_settings` table + RLS |
| `GoogleCalendarWidget.tsx` | New shared component |
| `ReportSettings.tsx` | Add calendar URL input section |
| `MyStats.tsx` | Import + render widget |
| `CanvasserStats.tsx` | Import + render widget |
| `SupplementerDashboard.tsx` | Import + render widget |
| `AdminOverview.tsx` | Import + render widget |

