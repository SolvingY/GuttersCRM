
-- Create change_lead_type function that atomically adjusts metrics
CREATE OR REPLACE FUNCTION public.change_lead_type(p_lead_id uuid, p_new_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead RECORD;
  v_old_type TEXT;
BEGIN
  SELECT lead_type, assigned_to, counted_as_lead INTO v_lead
  FROM public.quote_requests WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  v_old_type := v_lead.lead_type;

  -- If same type, nothing to do
  IF v_old_type = p_new_type THEN
    RETURN;
  END IF;

  -- If lead was counted and assigned, adjust metrics
  IF v_lead.counted_as_lead = TRUE AND v_lead.assigned_to IS NOT NULL THEN
    -- Decrement old type
    IF v_old_type = 'internet' THEN
      UPDATE public.user_metrics SET internet_leads = GREATEST(internet_leads - 1, 0), updated_at = NOW() WHERE user_id = v_lead.assigned_to;
    ELSIF v_old_type = 'canvasser' THEN
      UPDATE public.user_metrics SET canvass_leads = GREATEST(COALESCE(canvass_leads, 0) - 1, 0), updated_at = NOW() WHERE user_id = v_lead.assigned_to;
    ELSIF v_old_type = 'self_gen' THEN
      UPDATE public.user_metrics SET self_generated_leads = GREATEST(COALESCE(self_generated_leads, 0) - 1, 0), updated_at = NOW() WHERE user_id = v_lead.assigned_to;
    END IF;

    -- Increment new type
    IF p_new_type = 'internet' THEN
      UPDATE public.user_metrics SET internet_leads = internet_leads + 1, updated_at = NOW() WHERE user_id = v_lead.assigned_to;
    ELSIF p_new_type = 'canvasser' THEN
      UPDATE public.user_metrics SET canvass_leads = COALESCE(canvass_leads, 0) + 1, updated_at = NOW() WHERE user_id = v_lead.assigned_to;
    ELSIF p_new_type = 'self_gen' THEN
      UPDATE public.user_metrics SET self_generated_leads = COALESCE(self_generated_leads, 0) + 1, updated_at = NOW() WHERE user_id = v_lead.assigned_to;
    END IF;
  END IF;

  -- Update the lead type
  UPDATE public.quote_requests SET lead_type = p_new_type, updated_at = NOW() WHERE id = p_lead_id;

  -- Log the change
  INSERT INTO public.lead_activity_log (lead_id, user_id, activity_type, content)
  VALUES (p_lead_id, auth.uid(), 'type_change', 'Lead type changed from ' || v_old_type || ' to ' || p_new_type);
END;
$function$;

-- One-time data fix: Russ Pace lead was changed to self_gen but metrics weren't adjusted
-- Adam Coury's internet_leads should go from 1->0, self_generated_leads from 0->1
UPDATE public.user_metrics
  SET internet_leads = GREATEST(internet_leads - 1, 0),
      self_generated_leads = COALESCE(self_generated_leads, 0) + 1,
      updated_at = NOW()
  WHERE user_id = '19ef75d9-221d-483c-996d-d395bc1f44c2';
