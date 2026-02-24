
CREATE OR REPLACE FUNCTION public.update_lead_close_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_amount NUMERIC;
  v_collections NUMERIC;
BEGIN
  v_amount := COALESCE(NEW.quote_amount, 0);

  -- Status changed TO 'won' (closed_deals + type counts only, NO approved_revenue)
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'won' AND NEW.assigned_to IS NOT NULL THEN
    IF NEW.lead_type = 'internet' THEN
      UPDATE public.user_metrics
        SET internet_leads_closed = internet_leads_closed + 1,
            closed_deals = COALESCE(closed_deals, 0) + 1,
            updated_at = NOW()
        WHERE user_id = NEW.assigned_to;
    ELSIF NEW.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics
        SET canvass_deals_closed = COALESCE(canvass_deals_closed, 0) + 1,
            closed_deals = COALESCE(closed_deals, 0) + 1,
            updated_at = NOW()
        WHERE user_id = NEW.assigned_to;
    ELSIF NEW.lead_type = 'self_gen' THEN
      UPDATE public.user_metrics
        SET self_generated_deals = COALESCE(self_generated_deals, 0) + 1,
            closed_deals = COALESCE(closed_deals, 0) + 1,
            updated_at = NOW()
        WHERE user_id = NEW.assigned_to;
    END IF;
  END IF;

  -- Status changed FROM 'won' (reverse closed_deals + type counts only)
  IF OLD.status = 'won' AND NEW.status IS DISTINCT FROM OLD.status AND OLD.assigned_to IS NOT NULL THEN
    IF OLD.lead_type = 'internet' THEN
      UPDATE public.user_metrics
        SET internet_leads_closed = GREATEST(internet_leads_closed - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            updated_at = NOW()
        WHERE user_id = OLD.assigned_to;
    ELSIF OLD.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics
        SET canvass_deals_closed = GREATEST(COALESCE(canvass_deals_closed, 0) - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            updated_at = NOW()
        WHERE user_id = OLD.assigned_to;
    ELSIF OLD.lead_type = 'self_gen' THEN
      UPDATE public.user_metrics
        SET self_generated_deals = GREATEST(COALESCE(self_generated_deals, 0) - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            updated_at = NOW()
        WHERE user_id = OLD.assigned_to;
    END IF;
  END IF;

  -- Status changed TO 'scheduled' (contract signed -> approved_revenue)
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'scheduled' AND NEW.assigned_to IS NOT NULL THEN
    UPDATE public.user_metrics
      SET approved_revenue = COALESCE(approved_revenue, 0) + v_amount,
          updated_at = NOW()
      WHERE user_id = NEW.assigned_to;
  END IF;

  -- Status changed FROM 'scheduled' (reverse approved_revenue)
  IF OLD.status = 'scheduled' AND NEW.status IS DISTINCT FROM OLD.status AND OLD.assigned_to IS NOT NULL THEN
    UPDATE public.user_metrics
      SET approved_revenue = GREATEST(COALESCE(approved_revenue, 0) - COALESCE(OLD.quote_amount, 0), 0),
          updated_at = NOW()
      WHERE user_id = OLD.assigned_to;
  END IF;

  -- Status changed TO 'completed' (job closed -> collections)
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' AND NEW.assigned_to IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_collections
    FROM public.lead_payments
    WHERE lead_id = NEW.id;

    UPDATE public.user_metrics
      SET collections = COALESCE(collections, 0) + v_collections,
          updated_at = NOW()
      WHERE user_id = NEW.assigned_to;
  END IF;

  -- Status changed FROM 'completed' (reverse collections)
  IF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM OLD.status AND OLD.assigned_to IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_collections
    FROM public.lead_payments
    WHERE lead_id = OLD.id;

    UPDATE public.user_metrics
      SET collections = GREATEST(COALESCE(collections, 0) - v_collections, 0),
          updated_at = NOW()
      WHERE user_id = OLD.assigned_to;
  END IF;

  RETURN NEW;
END;
$function$;

-- Also update archive_lead to match new logic:
-- When archiving a 'scheduled' lead, reverse approved_revenue (not on 'won')
-- When archiving a 'completed' lead, reverse collections too
CREATE OR REPLACE FUNCTION public.archive_lead(p_lead_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead RECORD;
  v_lead_date DATE;
  v_week_start DATE;
  v_collections NUMERIC;
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

  -- If the lead was won, decrement close counts (no approved_revenue here anymore)
  IF v_lead.status IN ('won', 'scheduled', 'completed') AND v_lead.assigned_to IS NOT NULL THEN
    IF v_lead.lead_type = 'internet' THEN
      UPDATE public.user_metrics
        SET internet_leads_closed = GREATEST(internet_leads_closed - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            updated_at = NOW()
        WHERE user_id = v_lead.assigned_to;
    ELSIF v_lead.lead_type = 'canvasser' THEN
      UPDATE public.user_metrics
        SET canvass_deals_closed = GREATEST(COALESCE(canvass_deals_closed, 0) - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            updated_at = NOW()
        WHERE user_id = v_lead.assigned_to;
    ELSIF v_lead.lead_type = 'self_gen' THEN
      UPDATE public.user_metrics
        SET self_generated_deals = GREATEST(COALESCE(self_generated_deals, 0) - 1, 0),
            closed_deals = GREATEST(COALESCE(closed_deals, 0) - 1, 0),
            updated_at = NOW()
        WHERE user_id = v_lead.assigned_to;
    END IF;
  END IF;

  -- If the lead was scheduled or completed, reverse approved_revenue
  IF v_lead.status IN ('scheduled', 'completed') AND v_lead.assigned_to IS NOT NULL THEN
    UPDATE public.user_metrics
      SET approved_revenue = GREATEST(COALESCE(approved_revenue, 0) - COALESCE(v_lead.quote_amount, 0), 0),
          updated_at = NOW()
      WHERE user_id = v_lead.assigned_to;
  END IF;

  -- If the lead was completed, reverse collections
  IF v_lead.status = 'completed' AND v_lead.assigned_to IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_collections
    FROM public.lead_payments
    WHERE lead_id = v_lead.id;

    UPDATE public.user_metrics
      SET collections = GREATEST(COALESCE(collections, 0) - v_collections, 0),
          updated_at = NOW()
      WHERE user_id = v_lead.assigned_to;
  END IF;

  -- Rollback canvasser metrics if lead was created by a canvasser
  IF v_lead.canvasser_id IS NOT NULL THEN
    v_lead_date := v_lead.created_at::DATE;
    v_week_start := v_lead_date - ((EXTRACT(ISODOW FROM v_lead_date)::INT - 1) || ' days')::INTERVAL;

    UPDATE public.canvasser_metrics
      SET leads_set = GREATEST(COALESCE(leads_set, 0) - 1, 0),
          updated_at = NOW()
      WHERE user_id = v_lead.canvasser_id;

    UPDATE public.weekly_canvasser_metrics
      SET leads_set = GREATEST(COALESCE(leads_set, 0) - 1, 0),
          updated_at = NOW()
      WHERE user_id = v_lead.canvasser_id AND week_start = v_week_start;

    UPDATE public.daily_canvasser_metric_entries
      SET leads_set_delta = GREATEST(COALESCE(leads_set_delta, 0) - 1, 0),
          updated_at = NOW()
      WHERE user_id = v_lead.canvasser_id AND entry_date = v_lead_date;
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
