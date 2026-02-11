
-- Re-add the broad SELECT policy on the base table (needed for leaderboard view to work with SECURITY INVOKER)
CREATE POLICY "Authenticated users can view all canvasser weekly metrics"
  ON public.weekly_canvasser_metrics
  FOR SELECT
  USING (true);
