
-- Fix the SECURITY DEFINER view issue - use SECURITY INVOKER instead
ALTER VIEW public.weekly_canvasser_metrics_leaderboard SET (security_invoker = on);
