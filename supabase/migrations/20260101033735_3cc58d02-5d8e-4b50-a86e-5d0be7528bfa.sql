-- Add income column to canvasser_metrics
ALTER TABLE public.canvasser_metrics 
ADD COLUMN IF NOT EXISTS income numeric DEFAULT 0;

-- Add winner tracking columns to contests
ALTER TABLE public.contests 
ADD COLUMN IF NOT EXISTS winner_2nd_user_id uuid,
ADD COLUMN IF NOT EXISTS winner_2nd_display_name text,
ADD COLUMN IF NOT EXISTS winner_3rd_user_id uuid,
ADD COLUMN IF NOT EXISTS winner_3rd_display_name text,
ADD COLUMN IF NOT EXISTS points_awarded boolean DEFAULT false;

-- Create contest_victories table for tracking wins and showing victory messages
CREATE TABLE IF NOT EXISTS public.contest_victories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  place integer NOT NULL CHECK (place IN (1, 2, 3)),
  points_awarded integer NOT NULL DEFAULT 0,
  acknowledged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on contest_victories
ALTER TABLE public.contest_victories ENABLE ROW LEVEL SECURITY;

-- RLS policies for contest_victories
CREATE POLICY "Users can view their own victories"
ON public.contest_victories
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all victories"
ON public.contest_victories
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert victories"
ON public.contest_victories
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update victories"
ON public.contest_victories
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own victory acknowledgment"
ON public.contest_victories
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create leads_attribution table for Sales-Canvasser linking
CREATE TABLE IF NOT EXISTS public.leads_attribution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvasser_id uuid NOT NULL,
  sales_rep_id uuid,
  lead_status text DEFAULT 'set' CHECK (lead_status IN ('set', 'closed', 'lost')),
  deal_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- Enable RLS on leads_attribution
ALTER TABLE public.leads_attribution ENABLE ROW LEVEL SECURITY;

-- RLS policies for leads_attribution
CREATE POLICY "Admins can view all attributions"
ON public.leads_attribution
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own attributions"
ON public.leads_attribution
FOR SELECT
USING (canvasser_id = auth.uid() OR sales_rep_id = auth.uid());

CREATE POLICY "Admins can insert attributions"
ON public.leads_attribution
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update attributions"
ON public.leads_attribution
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete attributions"
ON public.leads_attribution
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));