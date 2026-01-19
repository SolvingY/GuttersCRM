-- Fix the view with security_invoker to address security warnings
DROP VIEW IF EXISTS public.user_metrics_leaderboard;

CREATE VIEW public.user_metrics_leaderboard 
WITH (security_invoker=on) AS
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