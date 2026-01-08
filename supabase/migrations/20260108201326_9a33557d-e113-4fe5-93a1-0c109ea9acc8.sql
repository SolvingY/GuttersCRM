-- Create report_settings table to store scheduled report preferences
CREATE TABLE public.report_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.report_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view report settings
CREATE POLICY "Admins can view report settings"
ON public.report_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update report settings
CREATE POLICY "Admins can update report settings"
ON public.report_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert report settings
CREATE POLICY "Admins can insert report settings"
ON public.report_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.report_settings (setting_key, setting_value) VALUES
  ('scheduled_report_enabled', 'true'),
  ('scheduled_report_frequency', '"weekly"'),
  ('scheduled_report_day', '1'),
  ('scheduled_report_recipients', '[]'),
  ('include_sales_reps', 'true'),
  ('include_canvassers', 'true'),
  ('include_goals', 'true');