
ALTER TABLE public.canvasser_metrics ADD COLUMN cancelled_leads INTEGER DEFAULT 0;
ALTER TABLE public.weekly_canvasser_metrics ADD COLUMN cancelled_leads INTEGER DEFAULT 0;
ALTER TABLE public.daily_canvasser_metric_entries ADD COLUMN cancelled_leads_delta INTEGER DEFAULT 0;
