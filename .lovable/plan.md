

# Combine Reports into Notifications Page & Rename to "Reports"

## What's Changing

The user wants to:
1. Move the Canvasser EOD Report settings (currently in ReportSettings) into the Notifications page
2. Format the EOD report like a notification card (same card layout with toggle/email rows, not the current form-heavy layout)
3. Combine everything under one page called "Reports" (remove the separate "Report Settings" sidebar item)
4. Remove the tabs — just show all notification cards AND the report cards in one scrollable list
5. Keep routing stable so nothing breaks

## Current Structure

- **`/admin/notifications`** → `NotificationRouting.tsx` — has Tabs: "Notification Routing" | "Report Settings"
- **`/admin/reports`** → `ReportSettings.tsx` — standalone page with scheduled reports, calendar, EOD settings
- **Sidebar** has both "Report Settings" (`/admin/reports`) and "Notifications" (`/admin/notifications`) and "Calendar Setup" (`/admin/reports`)

## Plan

### Step 1 — Update Sidebar (`AdminLayout.tsx`)
- Remove "Report Settings" and "Calendar Setup" items
- Rename "Notifications" to "Reports" (keep path `/admin/notifications`)

### Step 2 — Rewrite `NotificationRouting.tsx` as unified "Reports" page
- Remove tabs — single scrollable page
- Page title: "Reports" with description "Manage notification routing and scheduled report settings"
- Render notification cards first (same format as now)
- Then add **3 new report-style cards** using the same visual format as notifications:

**Card: "Scheduled Performance Report"**
- Same card format as notifications (Mail icon, title, description, + Add button)
- Email rows with toggle/delete, same as notification entries
- Additional settings inline: frequency dropdown, day dropdown, content toggles (goals, sales, canvassers)
- "Send Test" button
- Store recipients via `notification_routing` table with type `scheduled_report` (OR keep current `report_settings` approach — keep existing approach to avoid migration)

**Card: "Canvasser EOD Report"**
- Same card format: BarChart3 icon, title, description
- Send time + frequency dropdowns inline
- Recipients via `ReportRecipientsSelector` (same as current)
- Save + Send Test buttons
- Note about cron schedule

**Card: "Team Calendar"**
- Same card format with Globe icon
- Calendar URL input + preview

### Step 3 — Update Routes (`App.tsx`)
- Redirect `/admin/reports` to `/admin/notifications` (or just remove the separate route and point both to NotificationRouting)
- Keep lazy import for NotificationRouting, remove standalone ReportSettings lazy import if no longer needed as a route

### Step 4 — Clean up
- ReportSettings.tsx can be kept as a component file (its sub-components are reused) or inlined into NotificationRouting
- Since the EOD card and Calendar card are already defined in ReportSettings.tsx, import them directly

## Files to Edit

| File | Change |
|------|--------|
| `src/pages/admin/AdminLayout.tsx` | Remove "Report Settings" + "Calendar Setup" sidebar items; rename "Notifications" → "Reports" |
| `src/pages/admin/NotificationRouting.tsx` | Remove tabs, add Scheduled Report card + EOD card + Calendar card below notifications, all using consistent card format |
| `src/App.tsx` | Change `/admin/reports` route to redirect to `/admin/notifications` (or remove) |
| `src/pages/admin/ReportSettings.tsx` | Keep file but remove default export page wrapper; export sub-components for reuse |

