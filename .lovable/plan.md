

# Apply Onboarding System Database Migrations

## Current State
The database is missing all onboarding infrastructure:
- No `onboarding_steps` table
- No `user_onboarding_progress` table
- No `mandatory_actions` table
- No `onboarding_complete` / `onboarding_completed_at` columns on `profiles`

Two migration files already exist in the codebase and contain the correct SQL.

## Plan

### Step 1: Apply Migration 1 — Onboarding System
Run the SQL from `supabase/migrations/20260306100000_onboarding_system.sql` via the database migration tool. This creates:
- `onboarding_complete` and `onboarding_completed_at` columns on `profiles`
- `onboarding_steps` table with 13 seeded steps
- `user_onboarding_progress` table
- `mandatory_actions` table
- All indexes, RLS policies, and two RPC functions (`initialize_user_onboarding`, `check_onboarding_complete`)
- Marks all existing users as onboarding complete

### Step 2: Apply Migration 2 — Document Signing Columns
Run the SQL from `supabase/migrations/20260306200000_document_signing.sql` to add `signature_data`, `signed_at`, `signed_by_name` to `mandatory_actions` and `signature_data`, `signed_by_name` to `contractor_files`.

### Step 3: Regenerate Types
After both migrations are applied, the auto-generated `src/integrations/supabase/types.ts` will update to include the new tables and columns, removing the need for `as any` casts.

No code file changes are needed — the frontend already references these tables (with `as any` casts). Once the schema exists, everything will work.

