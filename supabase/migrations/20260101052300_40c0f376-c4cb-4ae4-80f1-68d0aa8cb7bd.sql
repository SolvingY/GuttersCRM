-- Create function to calculate canvasser points for YTD metrics
CREATE OR REPLACE FUNCTION public.calculate_canvasser_points()
RETURNS TRIGGER AS $$
BEGIN
  NEW.points := (COALESCE(NEW.leads_closed, 0) * 10) + 
                (COALESCE(NEW.leads_with_damage, 0) * 5) + 
                (COALESCE(NEW.leads_set, 0) * 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for canvasser_metrics
CREATE TRIGGER update_canvasser_points
  BEFORE INSERT OR UPDATE ON public.canvasser_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_canvasser_points();

-- Create function to calculate weekly canvasser points
CREATE OR REPLACE FUNCTION public.calculate_weekly_canvasser_points()
RETURNS TRIGGER AS $$
BEGIN
  NEW.points_earned := (COALESCE(NEW.leads_closed, 0) * 10) + 
                       (COALESCE(NEW.leads_with_damage, 0) * 5) + 
                       (COALESCE(NEW.leads_set, 0) * 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for weekly_canvasser_metrics
CREATE TRIGGER update_weekly_canvasser_points
  BEFORE INSERT OR UPDATE ON public.weekly_canvasser_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_weekly_canvasser_points();

-- Update existing YTD canvasser metrics with correct points
UPDATE public.canvasser_metrics 
SET points = (COALESCE(leads_closed, 0) * 10) + 
             (COALESCE(leads_with_damage, 0) * 5) + 
             (COALESCE(leads_set, 0) * 1);

-- Update existing weekly canvasser metrics with correct points
UPDATE public.weekly_canvasser_metrics 
SET points_earned = (COALESCE(leads_closed, 0) * 10) + 
                    (COALESCE(leads_with_damage, 0) * 5) + 
                    (COALESCE(leads_set, 0) * 1);