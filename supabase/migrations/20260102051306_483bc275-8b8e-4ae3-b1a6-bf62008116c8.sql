-- Create company_goals table for 12-month company-wide goal tracking
CREATE TABLE public.company_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_start DATE NOT NULL,
  fiscal_year_end DATE NOT NULL,
  sales_revenue_goal NUMERIC DEFAULT 0,
  canvasser_leads_goal INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.company_goals ENABLE ROW LEVEL SECURITY;

-- Admins can manage company goals
CREATE POLICY "Admins can manage company goals"
  ON public.company_goals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view company goals
CREATE POLICY "Authenticated users can view company goals"
  ON public.company_goals FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_company_goals_updated_at
  BEFORE UPDATE ON public.company_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();