-- Add new columns to canvasser_metrics
ALTER TABLE public.canvasser_metrics
ADD COLUMN IF NOT EXISTS conversations_had integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS not_interested integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_without_damage integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_worked numeric DEFAULT 0;

-- Add new columns to weekly_canvasser_metrics
ALTER TABLE public.weekly_canvasser_metrics
ADD COLUMN IF NOT EXISTS conversations_had integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS not_interested integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_without_damage integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_worked numeric DEFAULT 0;

-- Add new columns to daily_canvasser_metric_entries
ALTER TABLE public.daily_canvasser_metric_entries
ADD COLUMN IF NOT EXISTS conversations_had_delta integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS not_interested_delta integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_without_damage_delta integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_worked_delta numeric DEFAULT 0;