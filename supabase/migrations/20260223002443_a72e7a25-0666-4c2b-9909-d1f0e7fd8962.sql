
ALTER TABLE public.weekly_user_metrics
ADD COLUMN IF NOT EXISTS self_generated_deals integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS internet_leads integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS internet_leads_closed integer DEFAULT 0;
