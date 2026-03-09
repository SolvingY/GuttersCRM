

# Plan: Assigned Zones Widget, Onboarding Reminder Email, and Geofence UX Improvements

## 1. Assigned Zones Widget on Canvasser Dashboard (`CanvasserStats.tsx`)

Add a new section near the top (after TimeClockWidget) showing the canvasser's applicable geofence zones:
- Fetch `geofence_work_zones` (active) and `canvasser_zone_assignments` (user's + all) to determine applicable zones
- For each zone: show name, radius in miles, and a **clickable** Google Maps embed that opens Google Maps in a new tab when clicked
- If no zones apply: show "No specific work zones assigned"

## 2. Radius: Switch from Meters to Miles

### Admin UI (`AdminTimeClock.tsx`)
- Change the "Radius (meters)" label to "Radius (miles)"
- Input accepts miles (e.g. 1, 0.5, 2), default to 1 mile
- Convert to meters before saving: `miles * 1609.34`
- Display on zone cards as miles: `(zone.radius_meters / 1609.34).toFixed(1) mi radius`

### Clock-in logic (`TimeClockWidget.tsx`)
- No change needed — the DB still stores meters, Haversine still compares in meters. Only the UI label changes.

## 3. Red Radius Circle on Map Preview

In both the **Add Zone modal** (AdminTimeClock) and the **canvasser widget** (CanvasserStats), replace the simple Google Maps embed with one that includes a visible radius circle. Since Google Maps embeds don't support drawing circles natively, use a **Google Maps Static API alternative**: construct a KML circle overlay URL or, more practically, use the Google Maps JavaScript API in a lightweight inline approach.

**Simpler approach**: Use an `<iframe>` with a custom HTML page via a data URL or a small inline approach that draws a circle using the Google Maps JS API. However, this requires an API key.

**Practical approach without API key**: Keep the Google Maps embed but add a **CSS overlay circle** that approximates the radius visually. The circle diameter is calculated based on the zoom level and radius. This is a visual approximation but works well enough for a preview.

Actually, the best no-API-key approach: Use **OpenStreetMap + Leaflet** via a data URI iframe to render a map with a red circle. But that's complex.

**Chosen approach**: Keep the Google Maps embed iframe, and overlay a semi-transparent red circle using CSS `position: absolute` with a calculated size based on zoom level. The zoom level will be dynamically set based on the radius so the circle is always visible and proportionate. This gives a clear visual indicator without needing any API key.

For the map zoom calculation: at zoom 15, 1 pixel ≈ 4.78 meters. So a 1-mile (1609m) radius circle would be ~672px diameter — too big. We'll adjust zoom based on radius to keep the circle at ~60-70% of the container width, and size the CSS circle accordingly.

## 4. Clickable Map on Canvasser Dashboard

The map preview in the canvasser widget will be wrapped in an `<a>` tag that opens Google Maps at the zone's coordinates in a new tab.

## 5. Daily Onboarding Reminder Email (Configurable Recipients)

### Database
- Create a `report_email_settings` table with columns: `id`, `report_type` (e.g. 'onboarding_reminder'), `recipient_emails` (text[]), `is_active` (boolean), `updated_at`, `updated_by`
- RLS: admin-only management, no public access

### Admin UI
- Add a settings section in the **Onboarding Management** page (or Notification Routing page) where admins can configure recipient emails for the daily onboarding report
- Simple multi-email input with add/remove chips
- Default to Kara and Jonathan's emails

### Edge Function: `send-onboarding-reminder`
- Query `profiles` where `onboarding_complete = false` and `is_archived = false`
- For each, join with `onboarding_steps` and `user_onboarding_progress` to build a checklist
- Query `report_email_settings` for recipient list
- Send HTML email via Resend with a table showing each person's pending steps
- From: `notifications@oknextgen.com`

### Cron job
- Schedule via `pg_cron` to run daily at 8:00 AM CT (13:00 UTC)

## Summary of Files Changed

| File | Change |
|------|--------|
| `src/pages/canvasser/CanvasserStats.tsx` | Add AssignedZonesWidget with clickable maps |
| `src/pages/admin/AdminTimeClock.tsx` | Radius in miles, CSS radius circle overlay on map |
| `src/pages/admin/OnboardingManagement.tsx` | Add recipient settings UI for daily report |
| `supabase/functions/send-onboarding-reminder/index.ts` | New edge function |
| `supabase/config.toml` | Add function config |
| Migration | New `report_email_settings` table + pg_cron job |

