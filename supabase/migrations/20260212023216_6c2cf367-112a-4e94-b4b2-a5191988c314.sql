
-- A. New BEFORE INSERT trigger function
CREATE OR REPLACE FUNCTION public.count_lead_on_insert_assign()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NEW.counted_as_lead = FALSE THEN
    IF NEW.lead_type = 'internet' THEN
      UPDATE public.user_metrics SET internet_leads = internet_leads + 1, updated_at = NOW() WHERE user_id = NEW.assigned_to;
    ELSIF NEW.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics SET canvass_leads = COALESCE(canvass_leads, 0) + 1, updated_at = NOW() WHERE user_id = NEW.assigned_to;
    END IF;
    NEW.counted_as_lead := TRUE;
    NEW.lead_counted_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Trigger name starts with "count_lead" which comes after "auto_assign" alphabetically
CREATE TRIGGER count_lead_on_insert_assign
  BEFORE INSERT ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.count_lead_on_insert_assign();

-- B. One-time data fix: update internet_leads for uncounted assigned leads
UPDATE public.user_metrics um
SET internet_leads = internet_leads + sub.cnt, updated_at = NOW()
FROM (
  SELECT assigned_to, COUNT(*) as cnt
  FROM public.quote_requests
  WHERE assigned_to IS NOT NULL AND counted_as_lead = FALSE AND lead_type = 'internet'
  GROUP BY assigned_to
) sub
WHERE um.user_id = sub.assigned_to;

-- Fix canvasser leads too
UPDATE public.user_metrics um
SET canvass_leads = COALESCE(canvass_leads, 0) + sub.cnt, updated_at = NOW()
FROM (
  SELECT assigned_to, COUNT(*) as cnt
  FROM public.quote_requests
  WHERE assigned_to IS NOT NULL AND counted_as_lead = FALSE AND lead_type = 'canvasser'
  GROUP BY assigned_to
) sub
WHERE um.user_id = sub.assigned_to;

-- Mark all uncounted leads as counted
UPDATE public.quote_requests
SET counted_as_lead = TRUE, lead_counted_at = NOW()
WHERE assigned_to IS NOT NULL AND counted_as_lead = FALSE;
