-- Fix: Allow all authenticated users to view metrics for leaderboard
CREATE POLICY "Authenticated users can view all metrics for leaderboard"
ON public.user_metrics
FOR SELECT
TO authenticated
USING (true);

-- Create contests table
CREATE TABLE public.contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  prize_description text NOT NULL,
  prize_value numeric DEFAULT 0,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  metric_type text NOT NULL DEFAULT 'sales',
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view contests
CREATE POLICY "Authenticated users can view contests"
ON public.contests
FOR SELECT
TO authenticated
USING (true);

-- Only admins can create contests
CREATE POLICY "Admins can create contests"
ON public.contests
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update contests
CREATE POLICY "Admins can update contests"
ON public.contests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete contests
CREATE POLICY "Admins can delete contests"
ON public.contests
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_contests_updated_at
BEFORE UPDATE ON public.contests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();