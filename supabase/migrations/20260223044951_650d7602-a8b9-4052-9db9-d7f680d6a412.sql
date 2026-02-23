
-- Create SECURITY DEFINER function to atomically increment canvasser lead_set across all 3 levels
CREATE OR REPLACE FUNCTION public.increment_canvasser_lead_set(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Calculate Monday-Sunday week
  v_week_start := v_today - ((EXTRACT(ISODOW FROM v_today)::INT - 1) || ' days')::INTERVAL;
  v_week_end := v_week_start + INTERVAL '6 days';

  -- 1. YTD: increment leads_set (points auto-calculated by existing trigger)
  UPDATE public.canvasser_metrics
    SET leads_set = COALESCE(leads_set, 0) + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;

  -- 2. Weekly: upsert for current week
  INSERT INTO public.weekly_canvasser_metrics (user_id, week_start, week_end, leads_set)
  VALUES (p_user_id, v_week_start, v_week_end, 1)
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET
    leads_set = COALESCE(weekly_canvasser_metrics.leads_set, 0) + 1,
    updated_at = NOW();

  -- 3. Daily: upsert for today
  INSERT INTO public.daily_canvasser_metric_entries (user_id, entry_date, leads_set_delta)
  VALUES (p_user_id, v_today, 1)
  ON CONFLICT (user_id, entry_date)
  DO UPDATE SET
    leads_set_delta = COALESCE(daily_canvasser_metric_entries.leads_set_delta, 0) + 1,
    updated_at = NOW();
END;
$function$;

-- Update archive_lead to also rollback canvasser metrics
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

  -- Rollback canvasser metrics if lead was created by a canvasser
  IF v_lead.canvasser_id IS NOT NULL THEN
    v_lead_date := v_lead.created_at::DATE;
    v_week_start := v_lead_date - ((EXTRACT(ISODOW FROM v_lead_date)::INT - 1) || ' days')::INTERVAL;

    -- Decrement YTD leads_set (points recalculated by trigger)
    UPDATE public.canvasser_metrics
      SET leads_set = GREATEST(COALESCE(leads_set, 0) - 1, 0),
          updated_at = NOW()
      WHERE user_id = v_lead.canvasser_id;

    -- Decrement weekly leads_set
    UPDATE public.weekly_canvasser_metrics
      SET leads_set = GREATEST(COALESCE(leads_set, 0) - 1, 0),
          updated_at = NOW()
      WHERE user_id = v_lead.canvasser_id AND week_start = v_week_start;

    -- Decrement daily leads_set_delta
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
