-- Drop and recreate the user_metrics_leaderboard view to use approved_revenue instead of sales
DROP VIEW IF EXISTS public.user_metrics_leaderboard;

CREATE VIEW public.user_metrics_leaderboard AS
SELECT 
  id,
  user_id,
  display_name,
  approved_revenue,
  points,
  closed_deals,
  leads,
  sales_rank,
  self_generated_deals,
  metric_date,
  created_at,
  updated_at
FROM user_metrics;