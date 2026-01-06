-- Create daily_user_metric_entries table for daily delta tracking
CREATE TABLE public.daily_user_metric_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_revenue_delta NUMERIC DEFAULT 0,
  collections_delta NUMERIC DEFAULT 0,
  sales_delta NUMERIC DEFAULT 0,
  leads_delta INTEGER DEFAULT 0,
  closed_deals_delta INTEGER DEFAULT 0,
  earnings_delta NUMERIC DEFAULT 0,
  self_generated_leads_delta INTEGER DEFAULT 0,
  self_generated_deals_delta INTEGER DEFAULT 0,
  canvass_leads_delta INTEGER DEFAULT 0,
  canvass_deals_closed_delta INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  notes TEXT,
  entered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_canvasser_metric_entries table for daily delta tracking
CREATE TABLE public.daily_canvasser_metric_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leads_set_delta INTEGER DEFAULT 0,
  leads_closed_delta INTEGER DEFAULT 0,
  leads_with_damage_delta INTEGER DEFAULT 0,
  shifts_worked_delta INTEGER DEFAULT 0,
  doors_knocked_delta INTEGER DEFAULT 0,
  income_delta NUMERIC DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  notes TEXT,
  entered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_user_metric_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_canvasser_metric_entries ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage daily user entries" ON public.daily_user_metric_entries
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage daily canvasser entries" ON public.daily_canvasser_metric_entries
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own entries
CREATE POLICY "Users can view own daily entries" ON public.daily_user_metric_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Canvassers can view own daily entries" ON public.daily_canvasser_metric_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_daily_user_entries_user_date ON public.daily_user_metric_entries(user_id, entry_date);
CREATE INDEX idx_daily_user_entries_date ON public.daily_user_metric_entries(entry_date);
CREATE INDEX idx_daily_canvasser_entries_user_date ON public.daily_canvasser_metric_entries(user_id, entry_date);
CREATE INDEX idx_daily_canvasser_entries_date ON public.daily_canvasser_metric_entries(entry_date);

-- Trigger for updated_at
CREATE TRIGGER update_daily_user_entries_updated_at
  BEFORE UPDATE ON public.daily_user_metric_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_canvasser_entries_updated_at
  BEFORE UPDATE ON public.daily_canvasser_metric_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();