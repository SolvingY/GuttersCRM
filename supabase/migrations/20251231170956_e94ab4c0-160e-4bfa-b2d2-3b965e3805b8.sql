
-- Add display_name column to user_metrics for test users without auth accounts
ALTER TABLE public.user_metrics ADD COLUMN IF NOT EXISTS display_name text;

-- Make user_id nullable to allow test entries without real auth users
ALTER TABLE public.user_metrics ALTER COLUMN user_id DROP NOT NULL;

-- Drop the foreign key constraint on user_id to allow test data
ALTER TABLE public.user_metrics DROP CONSTRAINT IF EXISTS user_metrics_user_id_fkey;
