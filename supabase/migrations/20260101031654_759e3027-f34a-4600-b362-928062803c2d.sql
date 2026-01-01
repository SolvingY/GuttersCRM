-- Phase 1: Add 'canvasser' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'canvasser';

-- Create canvasser_metrics table
CREATE TABLE public.canvasser_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  display_name TEXT,
  leads_set INTEGER DEFAULT 0,
  leads_closed INTEGER DEFAULT 0,
  leads_with_damage INTEGER DEFAULT 0,
  shifts_worked INTEGER DEFAULT 0,
  points NUMERIC DEFAULT 0,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on canvasser_metrics
ALTER TABLE public.canvasser_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for canvasser_metrics
CREATE POLICY "Canvassers can view their own metrics"
ON public.canvasser_metrics
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view all metrics for leaderboard"
ON public.canvasser_metrics
FOR SELECT
USING (true);

CREATE POLICY "Admins can view all canvasser metrics"
ON public.canvasser_metrics
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert canvasser metrics"
ON public.canvasser_metrics
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update canvasser metrics"
ON public.canvasser_metrics
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Canvassers can update their own display_name"
ON public.canvasser_metrics
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add target_role column to contests table for role-specific contests
ALTER TABLE public.contests ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'user';

-- Create trigger for updated_at on canvasser_metrics
CREATE TRIGGER update_canvasser_metrics_updated_at
BEFORE UPDATE ON public.canvasser_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user function to support canvasser role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv_record RECORD;
  user_role app_role;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Check for invitation presets to determine role
  SELECT preset_sales_rank, preset_yearly_goal, preset_display_name
  INTO inv_record
  FROM public.invitations
  WHERE email = NEW.email
    AND is_used = TRUE
  ORDER BY used_at DESC
  LIMIT 1;
  
  -- Get the role from user_roles (inserted by create-user function or default)
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = NEW.id
  LIMIT 1;
  
  -- If no role exists yet, insert default 'user' role
  IF user_role IS NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    user_role := 'user';
  END IF;
  
  -- Create metrics based on role
  IF user_role = 'canvasser' THEN
    -- Create canvasser metrics
    INSERT INTO public.canvasser_metrics (user_id, display_name, metric_date)
    VALUES (
      NEW.id,
      COALESCE(inv_record.preset_display_name, NEW.raw_user_meta_data ->> 'full_name'),
      CURRENT_DATE
    );
  ELSE
    -- Create user metrics (for 'user' and 'admin' roles)
    INSERT INTO public.user_metrics (user_id, display_name, sales_rank, yearly_goal, metric_date)
    VALUES (
      NEW.id,
      COALESCE(inv_record.preset_display_name, NEW.raw_user_meta_data ->> 'full_name'),
      COALESCE(inv_record.preset_sales_rank, 'SR1'),
      COALESCE(inv_record.preset_yearly_goal, 0),
      CURRENT_DATE
    );
  END IF;
  
  RETURN NEW;
END;
$$;