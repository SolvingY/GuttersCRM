-- Add contest_points and wager_points columns to user_metrics
ALTER TABLE public.user_metrics
ADD COLUMN IF NOT EXISTS contest_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS wager_points integer DEFAULT 0;

-- Add contest_points and wager_points columns to canvasser_metrics
ALTER TABLE public.canvasser_metrics
ADD COLUMN IF NOT EXISTS contest_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS wager_points integer DEFAULT 0;