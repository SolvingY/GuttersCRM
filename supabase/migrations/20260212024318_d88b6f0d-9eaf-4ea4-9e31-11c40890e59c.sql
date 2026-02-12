-- Add archive fields to quote_requests
ALTER TABLE public.quote_requests 
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN archived_reason TEXT,
  ADD COLUMN archived_by UUID;

-- Create archive_lead function that decrements metrics
CREATE OR REPLACE FUNCTION public.archive_lead(p_lead_id UUID, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
BEGIN
  -- Get the lead
  SELECT * INTO v_lead FROM public.quote_requests WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- If the lead was counted, decrement the rep's lead count
  IF v_lead.counted_as_lead = TRUE AND v_lead.assigned_to IS NOT NULL THEN
    IF v_lead.lead_type = 'internet' THEN
      UPDATE public.user_metrics
        SET internet_leads = GREATEST(internet_leads - 1, 0),
            updated_at = NOW()
        WHERE user_id = v_lead.assigned_to;
    ELSIF v_lead.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics
        SET canvass_leads = GREATEST(COALESCE(canvass_leads, 0) - 1, 0),
            updated_at = NOW()
        WHERE user_id = v_lead.assigned_to;
    END IF;
  END IF;

  -- If the lead was won, decrement close counts and revenue
  IF v_lead.status = 'won' AND v_lead.assigned_to IS NOT NULL THEN
    IF v_lead.lead_type = 'internet' THEN
      UPDATE public.user_metrics
        SET internet_leads_closed = GREATEST(internet_leads_closed - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            approved_revenue = GREATEST(COALESCE(approved_revenue, 0) - COALESCE(v_lead.quote_amount, 0), 0),
            updated_at = NOW()
        WHERE user_id = v_lead.assigned_to;
    ELSIF v_lead.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics
        SET canvass_deals_closed = GREATEST(COALESCE(canvass_deals_closed, 0) - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            approved_revenue = GREATEST(COALESCE(approved_revenue, 0) - COALESCE(v_lead.quote_amount, 0), 0),
            updated_at = NOW()
        WHERE user_id = v_lead.assigned_to;
    END IF;
  END IF;

  -- Archive the lead
  UPDATE public.quote_requests
    SET archived_at = NOW(),
        archived_reason = p_reason,
        archived_by = auth.uid(),
        status = 'archived',
        assigned_to = NULL
    WHERE id = p_lead_id;

  -- Log the archive activity
  INSERT INTO public.lead_activity_log (lead_id, user_id, activity_type, content)
  VALUES (p_lead_id, auth.uid(), 'archived', 'Lead archived: ' || p_reason);
END;
$$;