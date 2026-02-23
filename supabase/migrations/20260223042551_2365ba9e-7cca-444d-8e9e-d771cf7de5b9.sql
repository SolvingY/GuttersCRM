
-- 1. Update create_manual_lead to support self_gen
CREATE OR REPLACE FUNCTION public.create_manual_lead(p_lead_source text, p_service_type text, p_full_name text, p_email text, p_phone text, p_street_address text, p_city text, p_state text DEFAULT 'Oklahoma'::text, p_zip_code text DEFAULT ''::text, p_timeline text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_assigned_to uuid DEFAULT NULL::uuid, p_priority text DEFAULT 'normal'::text, p_admin_notes text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref TEXT;
  v_lead_type TEXT;
  v_form_data JSONB;
BEGIN
  IF p_lead_source = 'phone_canvasser' THEN
    v_lead_type := 'canvasser';
  ELSIF p_lead_source = 'self_gen' THEN
    v_lead_type := 'self_gen';
  ELSE
    v_lead_type := 'internet';
  END IF;

  v_form_data := jsonb_build_object(
    'timeline', COALESCE(p_timeline, ''),
    'description', COALESCE(p_description, '')
  );

  INSERT INTO public.quote_requests (
    service_type, form_data, full_name, email, phone,
    street_address, city, state, zip_code,
    lead_source, lead_type, manually_created, created_by,
    priority, admin_notes,
    assigned_to, assigned_at, assigned_by
  ) VALUES (
    p_service_type, v_form_data, p_full_name, p_email, p_phone,
    p_street_address, p_city, p_state, p_zip_code,
    p_lead_source, v_lead_type, TRUE, auth.uid(),
    p_priority, p_admin_notes,
    p_assigned_to,
    CASE WHEN p_assigned_to IS NOT NULL THEN NOW() ELSE NULL END,
    CASE WHEN p_assigned_to IS NOT NULL THEN auth.uid() ELSE NULL END
  )
  RETURNING reference_number INTO v_ref;

  RETURN v_ref;
END;
$function$;

-- 2. Update count_lead_on_insert_assign to support self_gen
CREATE OR REPLACE FUNCTION public.count_lead_on_insert_assign()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND NEW.counted_as_lead = FALSE THEN
    IF NEW.lead_type = 'internet' THEN
      UPDATE public.user_metrics SET internet_leads = internet_leads + 1, updated_at = NOW() WHERE user_id = NEW.assigned_to;
    ELSIF NEW.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics SET canvass_leads = COALESCE(canvass_leads, 0) + 1, updated_at = NOW() WHERE user_id = NEW.assigned_to;
    ELSIF NEW.lead_type = 'self_gen' THEN
      UPDATE public.user_metrics SET self_generated_leads = COALESCE(self_generated_leads, 0) + 1, updated_at = NOW() WHERE user_id = NEW.assigned_to;
    END IF;
    NEW.counted_as_lead := TRUE;
    NEW.lead_counted_at := NOW();
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Update count_lead_on_assign to support self_gen
CREATE OR REPLACE FUNCTION public.count_lead_on_assign()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
     AND NEW.assigned_to IS NOT NULL
     AND NEW.counted_as_lead = FALSE
  THEN
    IF NEW.lead_type = 'internet' THEN
      UPDATE public.user_metrics
        SET internet_leads = internet_leads + 1, updated_at = NOW()
        WHERE user_id = NEW.assigned_to;
    ELSIF NEW.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics
        SET canvass_leads = canvass_leads + 1, updated_at = NOW()
        WHERE user_id = NEW.assigned_to;
    ELSIF NEW.lead_type = 'self_gen' THEN
      UPDATE public.user_metrics
        SET self_generated_leads = COALESCE(self_generated_leads, 0) + 1, updated_at = NOW()
        WHERE user_id = NEW.assigned_to;
    END IF;

    NEW.counted_as_lead := TRUE;
    NEW.lead_counted_at := NOW();
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Update update_lead_close_stats to support self_gen
CREATE OR REPLACE FUNCTION public.update_lead_close_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_amount NUMERIC;
BEGIN
  v_amount := COALESCE(NEW.quote_amount, 0);

  -- Status changed TO 'won'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'won' AND NEW.assigned_to IS NOT NULL THEN
    IF NEW.lead_type = 'internet' THEN
      UPDATE public.user_metrics
        SET internet_leads_closed = internet_leads_closed + 1,
            closed_deals = COALESCE(closed_deals, 0) + 1,
            approved_revenue = COALESCE(approved_revenue, 0) + v_amount,
            updated_at = NOW()
        WHERE user_id = NEW.assigned_to;
    ELSIF NEW.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics
        SET canvass_deals_closed = COALESCE(canvass_deals_closed, 0) + 1,
            closed_deals = COALESCE(closed_deals, 0) + 1,
            approved_revenue = COALESCE(approved_revenue, 0) + v_amount,
            updated_at = NOW()
        WHERE user_id = NEW.assigned_to;
    ELSIF NEW.lead_type = 'self_gen' THEN
      UPDATE public.user_metrics
        SET self_generated_deals = COALESCE(self_generated_deals, 0) + 1,
            closed_deals = COALESCE(closed_deals, 0) + 1,
            approved_revenue = COALESCE(approved_revenue, 0) + v_amount,
            updated_at = NOW()
        WHERE user_id = NEW.assigned_to;
    END IF;
  END IF;

  -- Status changed FROM 'won' (reversal)
  IF OLD.status = 'won' AND NEW.status IS DISTINCT FROM OLD.status AND OLD.assigned_to IS NOT NULL THEN
    v_amount := COALESCE(OLD.quote_amount, 0);
    IF OLD.lead_type = 'internet' THEN
      UPDATE public.user_metrics
        SET internet_leads_closed = GREATEST(internet_leads_closed - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            approved_revenue = GREATEST(COALESCE(approved_revenue, 0) - v_amount, 0),
            updated_at = NOW()
        WHERE user_id = OLD.assigned_to;
    ELSIF OLD.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics
        SET canvass_deals_closed = GREATEST(COALESCE(canvass_deals_closed, 0) - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            approved_revenue = GREATEST(COALESCE(approved_revenue, 0) - v_amount, 0),
            updated_at = NOW()
        WHERE user_id = OLD.assigned_to;
    ELSIF OLD.lead_type = 'self_gen' THEN
      UPDATE public.user_metrics
        SET self_generated_deals = GREATEST(COALESCE(self_generated_deals, 0) - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            approved_revenue = GREATEST(COALESCE(approved_revenue, 0) - v_amount, 0),
            updated_at = NOW()
        WHERE user_id = OLD.assigned_to;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Update archive_lead to support self_gen
CREATE OR REPLACE FUNCTION public.archive_lead(p_lead_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead RECORD;
BEGIN
  SELECT * INTO v_lead FROM public.quote_requests WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- If the lead was counted, decrement the rep's lead count
  IF v_lead.counted_as_lead = TRUE AND v_lead.assigned_to IS NOT NULL THEN
    IF v_lead.lead_type = 'internet' THEN
      UPDATE public.user_metrics
        SET internet_leads = GREATEST(internet_leads - 1, 0), updated_at = NOW()
        WHERE user_id = v_lead.assigned_to;
    ELSIF v_lead.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics
        SET canvass_leads = GREATEST(COALESCE(canvass_leads, 0) - 1, 0), updated_at = NOW()
        WHERE user_id = v_lead.assigned_to;
    ELSIF v_lead.lead_type = 'self_gen' THEN
      UPDATE public.user_metrics
        SET self_generated_leads = GREATEST(COALESCE(self_generated_leads, 0) - 1, 0), updated_at = NOW()
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
    ELSIF v_lead.lead_type = 'self_gen' THEN
      UPDATE public.user_metrics
        SET self_generated_deals = GREATEST(COALESCE(self_generated_deals, 0) - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            approved_revenue = GREATEST(COALESCE(approved_revenue, 0) - COALESCE(v_lead.quote_amount, 0), 0),
            updated_at = NOW()
        WHERE user_id = v_lead.assigned_to;
    END IF;
  END IF;

  UPDATE public.quote_requests
    SET archived_at = NOW(),
        archived_reason = p_reason,
        archived_by = auth.uid(),
        status = 'archived',
        assigned_to = NULL
    WHERE id = p_lead_id;

  INSERT INTO public.lead_activity_log (lead_id, user_id, activity_type, content)
  VALUES (p_lead_id, auth.uid(), 'archived', 'Lead archived: ' || p_reason);
END;
$function$;
