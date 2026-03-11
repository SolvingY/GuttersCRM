ALTER TABLE public.daily_user_metric_entries
  ADD CONSTRAINT daily_user_metric_entries_user_date_unique UNIQUE (user_id, entry_date);

ALTER TABLE public.canvasser_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.user_metrics REPLICA IDENTITY FULL;