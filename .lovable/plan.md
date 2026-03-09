

# Plan: Production Role — Full Portal Implementation

This is a large batch. Implementation will proceed in 6 steps across ~15 new files and ~8 modified files.

---

## Step 1 — Database Migrations

**Migration 1a** (alone — enum extension cannot be in a transaction with other DDL):
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'production';
```

**Migration 1b** — Create 7 tables exactly as specified in the batch instructions:
- `production_metrics` (YTD per user, points formula: `builds * 10 + checklists * 5`)
- `weekly_production_metrics` (leaderboard snapshots, unique on `user_id, week_start`)
- `daily_production_metric_entries` (admin deltas, unique on `user_id, entry_date`)
- `production_shifts` (time clock — uses `user_id`, mirrors `canvasser_shifts` structure)
- `production_checklists` (admin-managed templates with `checklist_type` enum)
- `production_checklist_submissions` (user submissions with `job_address`, `responses` jsonb)
- `production_daily_logs` (EOD activity log, unique on `user_id, log_date`)

**Migration 1c** — RLS policies on all 7 tables + seed 4 default checklist templates (Pre-Build, Post-Build, Water Test, Repair) + `updated_at` trigger.

No `create_production_metrics` DB trigger — metrics row creation handled in `admin-set-user-role` edge function (same pattern as supplementer).

---

## Step 2 — Edge Function: `send-production-eod-summary`

New file: `supabase/functions/send-production-eod-summary/index.ts`

- Queries `production_daily_logs` where `log_date = CURRENT_DATE` AND `email_sent = false` AND (`summary_notes IS NOT NULL OR builds_completed > 0`) — only includes rows where the contractor actually submitted their EOD log, not auto-created clock-out rows
- Joins `profiles` for display names
- Fetches recipients from `report_email_settings` where `report_type = 'production_eod_summary'`
- Sends one HTML table email via `RESEND_API_KEY`, from `notifications@oknextgen.com`
- Subject: `NGR Production Daily Summary — [Date]`
- Marks processed rows `email_sent = true`
- Config in `supabase/config.toml`: `[functions.send-production-eod-summary] verify_jwt = false`

Schedule via `pg_cron` at 23:00 UTC (5 PM CT) using the insert tool (not migration). Seed `report_email_settings` row for `production_eod_summary` via insert tool.

---

## Step 3 — Auth & Routing

### `useAuth.ts`
- Extend `AppRole` type: `'admin' | 'user' | 'canvasser' | 'supplementer' | 'production'`
- Extend `activeView` type: add `'production'`
- Add: `hasProductionRole`, `isProductionOnly` (production && !sales && !canvasser && !supplementer && !admin)
- Update `isDualRole` to include production combinations
- Update legacy `role` derivation to handle production-only users

### `ProtectedRoute.tsx`
- Add `requireProduction` prop
- Production-only users redirect to `/production` (same pattern as supplementer-only → `/supplementer`)
- Redirect non-production users away from `/production/*`
- Onboarding gate still applies

### `RoleViewToggle.tsx`
- Add `HardHat` icon import from lucide-react
- Add production toggle item: `value="production"`, navigate to `/production`
- Add URL sync for `/production` paths in useEffect

### `App.tsx`
- Add lazy imports for all production pages
- Add route group under `/production` with `ProtectedRoute requireProduction`:
  - index → Navigate to `/production/stats`
  - `stats` → ProductionDashboard
  - `leaderboard` → ProductionLeaderboard
  - `tools` → ProductionToolsHub
  - `tools/checklists` → ProductionChecklists
  - `pit` → ProductionPit
  - `points-history` → ProductionPointsHistory
  - `settings` → ProductionSettings

---

## Step 4 — New Pages & Components

### `ProductionLayout.tsx`
Mirror `SupplementerLayout.tsx` exactly — header, sidebar, login tracking, watermark ("PRODUCTION PORTAL"), VictoryNotification.

### `ProductionSidebar.tsx`
Mirror `SupplementerSidebar.tsx`. Nav items: My Stats, Onboarding, Leaderboard, Tools, The Pit, Points History, Settings. Use `HardHat` or `Wrench` themed icons. Title: "Production".

### `ProductionDashboard.tsx` (My Stats)
- Fetch `production_metrics` for current user
- Total Points card (same gradient pattern as supplementer)
- 4 StatsCards: Builds Completed, Build Issues, Checklists Completed, Build Efficiency (%)
- `ProductionTimeClockWidget`
- **Daily Activity Log form**: builds completed today, summary notes → upserts `production_daily_logs` for `log_date = today`. This is what the contractor submits at EOD to trigger the GM email.

### `ProductionTimeClockWidget.tsx`
Clean fork of `TimeClockWidget` scoped to production:
- Uses `production_shifts` table with `user_id` column (not `canvasser_id`)
- Same `getLocation()`, `distanceMeters()`, geofence check logic (duplicated — not refactored to avoid breaking canvasser clock)
- Clock-out modal: only `notes` (no doors/convos/leads fields)
- On clock-out: upserts `production_daily_logs.hours_worked` for today using `INSERT ... ON CONFLICT (user_id, log_date) DO UPDATE SET hours_worked = EXCLUDED.hours_worked`
- Same geofence warning modal, same pay period (Thu–Wed), same auto-close at 4 hours, same flagging

### `ProductionChecklists.tsx`
- Fetches active checklists from `production_checklists`
- Displays as cards grouped by `checklist_type`
- Click opens modal with checkbox items, job address input, notes textarea
- Submit: inserts to `production_checklist_submissions`, then increments `production_daily_logs.checklists_submitted` atomically using `INSERT ... ON CONFLICT (user_id, log_date) DO UPDATE SET checklists_submitted = production_daily_logs.checklists_submitted + 1` — no read-then-write
- Shows last 5 submissions per checklist below each card

### `ProductionToolsHub.tsx`
Links to Checklists (`/production/tools/checklists`) and shared tools (Gutter Estimator via `/dashboard/tools/*`).

### `ProductionLeaderboard.tsx`
Mirror canvasser leaderboard. Query `weekly_production_metrics` for current week. Columns: Rank, Name, Builds, Efficiency %, Points.

### `ProductionPit.tsx`
Fork of `SupplementerPit.tsx` — same wager system, but fetch points from `production_metrics` instead of `supplementer_metrics`. The Pit queries (`pit_wager_events`, `pit_wager_options`, `pit_wagers`) are role-agnostic.

### `ProductionPointsHistory.tsx` / `ProductionSettings.tsx`
Mirror supplementer equivalents, scoped to `production_metrics` / `point_transactions`.

---

## Step 5 — Admin Integration

### `EditUserRoleModal.tsx`
- Add `isProduction` state + `HardHat` icon checkbox
- Include `'production'` in roles array when checked
- Update type union to include `'production'`

### `admin-set-user-role/index.ts`
- Add `'production'` to `validRoles` array
- Add production metrics creation block (mirrors supplementer pattern): if `hasProductionRole`, check/create `production_metrics` row

### `UserRoles.tsx`
- Add `'production'` to roles type union
- Add badge: `<Badge className="bg-amber-500 text-white">Production</Badge>` (distinct from: admin=destructive/red, sales=secondary/gray, canvasser=primary/blue, supplementer=accent/green-ish)

### `AdminTimeClock.tsx`
- Add a "Production" tab alongside existing canvasser sections
- Fetch production users from `user_roles WHERE role = 'production'`
- Query `production_shifts` — same shift display, flagging, admin review flow
- Production shifts don't have doors/convos/leads fields — edit modal only shows hours + notes

### `InviteUsers.tsx`
- Add `'production'` as a role option in the invite role select

### Admin Checklist Management
Add a "Production Checklists" tab inside the existing admin tools area (Contractor Management page) — not a new top-level page. CRUD for `production_checklists` templates: create, edit title/items, activate/deactivate.

---

## Step 6 — Edge Function Config & Scheduling

- Add to `supabase/config.toml`: `[functions.send-production-eod-summary] verify_jwt = false`
- Verify `pg_cron` and `pg_net` extensions are enabled before scheduling
- Schedule via insert tool at 23:00 UTC daily
- Seed `report_email_settings` row for `production_eod_summary` via insert tool

---

## Files Summary

**New files (11):**
| File | Purpose |
|------|---------|
| `src/pages/production/ProductionLayout.tsx` | Layout |
| `src/components/production/ProductionSidebar.tsx` | Sidebar nav |
| `src/pages/production/ProductionDashboard.tsx` | Stats + time clock + daily log |
| `src/components/production/ProductionTimeClockWidget.tsx` | Time clock (fork) |
| `src/pages/production/ProductionChecklists.tsx` | Digital checklists |
| `src/pages/production/ProductionToolsHub.tsx` | Tools landing |
| `src/pages/production/ProductionLeaderboard.tsx` | Weekly leaderboard |
| `src/pages/production/ProductionPit.tsx` | Wagering |
| `src/pages/production/ProductionPointsHistory.tsx` | Points history |
| `src/pages/production/ProductionSettings.tsx` | Settings |
| `supabase/functions/send-production-eod-summary/index.ts` | EOD email |

**Modified files (8):**
| File | Change |
|------|--------|
| `src/hooks/useAuth.ts` | Add production role flags, extend types |
| `src/components/auth/ProtectedRoute.tsx` | Add `requireProduction`, redirects |
| `src/components/dashboard/RoleViewToggle.tsx` | Add production toggle |
| `src/App.tsx` | Add `/production/*` routes |
| `src/components/admin/EditUserRoleModal.tsx` | Add production checkbox |
| `src/pages/admin/UserRoles.tsx` | Amber production badge |
| `src/pages/admin/AdminTimeClock.tsx` | Production shifts tab |
| `supabase/functions/admin-set-user-role/index.ts` | Add production to valid roles + metrics creation |
| `src/pages/dashboard/InviteUsers.tsx` | Add production role option |
| `supabase/config.toml` | EOD function config |

