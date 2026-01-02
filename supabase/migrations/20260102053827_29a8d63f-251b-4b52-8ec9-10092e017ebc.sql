-- Add target goal columns to company_goals
ALTER TABLE public.company_goals
ADD COLUMN target_lead_to_close_ratio NUMERIC DEFAULT 0,
ADD COLUMN target_cost_per_lead NUMERIC DEFAULT 0;

-- Add self_generated_leads column to user_metrics
ALTER TABLE public.user_metrics
ADD COLUMN self_generated_leads INTEGER DEFAULT 0;