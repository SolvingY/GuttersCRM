ALTER TABLE public.daily_canvasser_metric_entries
  ADD CONSTRAINT daily_canvasser_metric_entries_user_date_unique
  UNIQUE (user_id, entry_date);