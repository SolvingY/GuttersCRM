CREATE OR REPLACE FUNCTION public.auto_assign_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_settings RECORD;
  v_rep_id uuid;
BEGIN
  -- Check if auto-assignment is enabled
  SELECT * INTO v_settings FROM public.auto_assignment_settings LIMIT 1;
  IF v_settings IS NULL OR NOT v_settings.enabled THEN
    RETURN NEW;
  END IF;

  -- Find best rep based on method
  -- All methods now join user_metrics to ensure only actual sales reps (not canvassers) are eligible
  IF v_settings.assignment_method = 'ranking_based' THEN
    SELECT ur.user_id INTO v_rep_id
    FROM public.user_roles ur
    INNER JOIN public.user_metrics um ON um.user_id = ur.user_id
    LEFT JOIN (
      SELECT assigned_to, COUNT(*) as active_count
      FROM public.quote_requests
      WHERE status NOT IN ('won', 'lost') AND assigned_to IS NOT NULL
      GROUP BY assigned_to
    ) ac ON ac.assigned_to = ur.user_id
    WHERE ur.role = 'user'
      AND COALESCE(ac.active_count, 0) < v_settings.max_leads_per_rep
    ORDER BY
      (COALESCE(um.closed_deals, 0)::numeric / NULLIF(COALESCE(um.leads, 0), 0)) DESC NULLS LAST,
      COALESCE(ac.active_count, 0) ASC
    LIMIT 1;
  ELSIF v_settings.assignment_method = 'workload_based' THEN
    SELECT ur.user_id INTO v_rep_id
    FROM public.user_roles ur
    INNER JOIN public.user_metrics um ON um.user_id = ur.user_id
    LEFT JOIN (
      SELECT assigned_to, COUNT(*) as active_count
      FROM public.quote_requests
      WHERE status NOT IN ('won', 'lost') AND assigned_to IS NOT NULL
      GROUP BY assigned_to
    ) ac ON ac.assigned_to = ur.user_id
    WHERE ur.role = 'user'
      AND COALESCE(ac.active_count, 0) < v_settings.max_leads_per_rep
    ORDER BY
      COALESCE(ac.active_count, 0) ASC,
      (COALESCE(um.closed_deals, 0)::numeric / NULLIF(COALESCE(um.leads, 0), 0)) DESC NULLS LAST
    LIMIT 1;
  ELSE
    -- round_robin: fewest active leads, must have user_metrics entry
    SELECT ur.user_id INTO v_rep_id
    FROM public.user_roles ur
    INNER JOIN public.user_metrics um ON um.user_id = ur.user_id
    LEFT JOIN (
      SELECT assigned_to, COUNT(*) as active_count
      FROM public.quote_requests
      WHERE status NOT IN ('won', 'lost') AND assigned_to IS NOT NULL
      GROUP BY assigned_to
    ) ac ON ac.assigned_to = ur.user_id
    WHERE ur.role = 'user'
      AND COALESCE(ac.active_count, 0) < v_settings.max_leads_per_rep
    ORDER BY COALESCE(ac.active_count, 0) ASC
    LIMIT 1;
  END IF;

  -- Assign if we found someone
  IF v_rep_id IS NOT NULL THEN
    NEW.assigned_to := v_rep_id;
    NEW.assigned_at := NOW();

    -- Log assignment
    INSERT INTO public.lead_activity_log (lead_id, user_id, activity_type, content)
    VALUES (NEW.id, v_rep_id, 'assignment', 'Auto-assigned to sales rep');
  END IF;

  RETURN NEW;
END;
$function$;