-- Add yearly_goal column to canvasser_metrics for goal tracking
ALTER TABLE public.canvasser_metrics
ADD COLUMN yearly_goal integer DEFAULT 0;