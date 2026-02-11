
-- Fix 1: Restrict weekly_canvasser_metrics to hide income from non-owners/non-admins
-- Remove the broad SELECT policy that exposes income to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view all canvasser weekly metrics" ON public.weekly_canvasser_metrics;

-- Create a view without income for leaderboard use
CREATE OR REPLACE VIEW public.weekly_canvasser_metrics_leaderboard AS
SELECT
  id, user_id, week_start, week_end,
  leads_set, leads_closed, leads_with_damage, leads_without_damage,
  shifts_worked, doors_knocked, conversations_had, not_interested,
  hours_worked, points_earned, canvasser_rank,
  created_at, updated_at
FROM public.weekly_canvasser_metrics;

-- Allow authenticated users to view the leaderboard view (no income)
GRANT SELECT ON public.weekly_canvasser_metrics_leaderboard TO authenticated;

-- Fix 2: Make quote-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'quote-photos';

-- Drop overly permissive storage policies
DROP POLICY IF EXISTS "Anyone can upload quote photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view quote photos" ON storage.objects;

-- Allow anyone to upload (needed for public quote form - unauthenticated users)
CREATE POLICY "Anyone can upload quote photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quote-photos');

-- Only admins and assigned reps can view quote photos
CREATE POLICY "Authenticated users can view quote photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'quote-photos');
