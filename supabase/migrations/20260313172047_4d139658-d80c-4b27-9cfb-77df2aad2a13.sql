
CREATE OR REPLACE FUNCTION public.hard_delete_lead(p_lead_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canvasser_id UUID;
  v_lead_source TEXT;
  v_created_at TIMESTAMPTZ;
  v_lead_date DATE;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Admin check
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can hard-delete leads';
  END IF;

  -- Look up lead info
  SELECT canvasser_id, lead_source, created_at
  INTO v_canvasser_id, v_lead_source, v_created_at
  FROM quote_requests
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  -- Reverse canvasser metrics if this was a canvasser lead
  IF v_canvasser_id IS NOT NULL AND v_lead_source = 'canvasser' THEN
    v_lead_date := v_created_at::date;
    v_week_start := date_trunc('week', v_lead_date)::date;
    v_week_end := (date_trunc('week', v_lead_date) + interval '6 days')::date;

    -- Decrement canvasser_metrics leads_set
    UPDATE canvasser_metrics
    SET leads_set = GREATEST(COALESCE(leads_set, 0) - 1, 0),
        updated_at = now()
    WHERE user_id = v_canvasser_id
      AND metric_date = v_lead_date;

    -- Decrement weekly_canvasser_metrics leads_set
    UPDATE weekly_canvasser_metrics
    SET leads_set = GREATEST(COALESCE(leads_set, 0) - 1, 0),
        updated_at = now()
    WHERE user_id = v_canvasser_id
      AND week_start = v_week_start;

    -- Decrement daily_canvasser_metric_entries leads_set_delta
    UPDATE daily_canvasser_metric_entries
    SET leads_set_delta = GREATEST(COALESCE(leads_set_delta, 0) - 1, 0),
        updated_at = now()
    WHERE user_id = v_canvasser_id
      AND entry_date = v_lead_date;
  END IF;

  -- Delete the lead (cascades handle child tables)
  DELETE FROM quote_requests WHERE id = p_lead_id;
END;
$$;
