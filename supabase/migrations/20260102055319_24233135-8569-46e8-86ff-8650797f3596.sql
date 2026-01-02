-- Allow all authenticated users to view user_metrics for leaderboard display
CREATE POLICY "Authenticated users can view all metrics for leaderboard"
  ON public.user_metrics
  FOR SELECT
  TO authenticated
  USING (true);