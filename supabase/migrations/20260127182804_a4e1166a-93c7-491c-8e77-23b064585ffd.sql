-- Add leads_set_goal and income_goal columns to canvasser_metrics
ALTER TABLE public.canvasser_metrics
ADD COLUMN IF NOT EXISTS leads_set_goal integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS income_goal numeric DEFAULT 0;

-- Add RLS policy allowing authenticated users to view all canvasser metrics for leaderboard
CREATE POLICY "Authenticated users can view all canvasser metrics for leaderboard"
ON public.canvasser_metrics
FOR SELECT
TO authenticated
USING (true);