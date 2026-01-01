-- Create weekly_user_metrics table to track sales rep weekly numbers
CREATE TABLE public.weekly_user_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  sales NUMERIC DEFAULT 0,
  leads INTEGER DEFAULT 0,
  closed_deals INTEGER DEFAULT 0,
  earnings NUMERIC DEFAULT 0,
  points_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Create weekly_canvasser_metrics table to track canvasser weekly numbers
CREATE TABLE public.weekly_canvasser_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  leads_set INTEGER DEFAULT 0,
  leads_closed INTEGER DEFAULT 0,
  leads_with_damage INTEGER DEFAULT 0,
  shifts_worked INTEGER DEFAULT 0,
  income NUMERIC DEFAULT 0,
  points_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.weekly_user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_canvasser_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_user_metrics
CREATE POLICY "Admins can manage weekly user metrics" 
ON public.weekly_user_metrics 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own weekly metrics" 
ON public.weekly_user_metrics 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view all weekly metrics for leaderboard" 
ON public.weekly_user_metrics 
FOR SELECT 
USING (true);

-- RLS policies for weekly_canvasser_metrics
CREATE POLICY "Admins can manage weekly canvasser metrics" 
ON public.weekly_canvasser_metrics 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Canvassers can view their own weekly metrics" 
ON public.weekly_canvasser_metrics 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view all canvasser weekly metrics" 
ON public.weekly_canvasser_metrics 
FOR SELECT 
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_weekly_user_metrics_updated_at
BEFORE UPDATE ON public.weekly_user_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_canvasser_metrics_updated_at
BEFORE UPDATE ON public.weekly_canvasser_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();