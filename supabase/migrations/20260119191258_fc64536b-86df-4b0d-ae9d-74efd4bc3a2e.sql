-- Fix canvasser_metrics_leaderboard view with security_invoker
DROP VIEW IF EXISTS public.canvasser_metrics_leaderboard;

CREATE VIEW public.canvasser_metrics_leaderboard 
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  display_name,
  leads_set,
  leads_closed,
  leads_with_damage,
  shifts_worked,
  points,
  metric_date,
  created_at,
  updated_at
FROM canvasser_metrics;