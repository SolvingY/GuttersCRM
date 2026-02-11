
-- ============================================================
-- Phase 2: RLS fix, auto-assignment, activity log, quote approval
-- ============================================================

-- 1. SECURITY DEFINER function to submit quote requests (fixes RLS bug)
CREATE OR REPLACE FUNCTION public.submit_quote_request(
  p_service_type text,
  p_form_data jsonb,
  p_full_name text,
  p_email text,
  p_phone text,
  p_street_address text,
  p_city text,
  p_state text DEFAULT 'Oklahoma',
  p_zip_code text DEFAULT '',
  p_best_contact_time text[] DEFAULT '{}',
  p_referral_source text DEFAULT NULL,
  p_photo_urls text[] DEFAULT '{}'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref text;
BEGIN
  INSERT INTO public.quote_requests (
    service_type, form_data, full_name, email, phone,
    street_address, city, state, zip_code,
    best_contact_time, referral_source, photo_urls
  ) VALUES (
    p_service_type, p_form_data, p_full_name, p_email, p_phone,
    p_street_address, p_city, p_state, p_zip_code,
    p_best_contact_time, p_referral_source, p_photo_urls
  )
  RETURNING reference_number INTO v_ref;

  RETURN v_ref;
END;
$$;

-- 2. Auto-assignment settings table
CREATE TABLE public.auto_assignment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  assignment_method text NOT NULL DEFAULT 'round_robin',
  max_leads_per_rep integer NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.auto_assignment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage auto assignment settings"
  ON public.auto_assignment_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default row
INSERT INTO public.auto_assignment_settings (enabled, assignment_method, max_leads_per_rep)
VALUES (false, 'round_robin', 10);

-- 3. Lead activity log table
CREATE TABLE public.lead_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  user_id uuid,
  activity_type text NOT NULL,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all lead activities"
  ON public.lead_activity_log FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Assigned reps can view lead activities"
  ON public.lead_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quote_requests
      WHERE id = lead_activity_log.lead_id
      AND assigned_to = auth.uid()
    )
  );

CREATE POLICY "Assigned reps can insert lead activities"
  ON public.lead_activity_log FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.quote_requests
      WHERE id = lead_activity_log.lead_id
      AND assigned_to = auth.uid()
    )
  );

-- 4. Add quote approval columns to quote_requests
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS quote_status text,
  ADD COLUMN IF NOT EXISTS quote_submitted_by uuid,
  ADD COLUMN IF NOT EXISTS quote_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS quote_rejected_reason text;

-- 5. RLS policy: assigned reps can update their own leads (status, notes, quote submission)
CREATE POLICY "Assigned reps can update their leads"
  ON public.quote_requests FOR UPDATE
  USING (assigned_to = auth.uid());

-- 6. Auto-assign lead function
CREATE OR REPLACE FUNCTION public.auto_assign_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF v_settings.assignment_method = 'ranking_based' THEN
    SELECT ur.user_id INTO v_rep_id
    FROM public.user_roles ur
    LEFT JOIN public.user_metrics um ON um.user_id = ur.user_id
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
    LEFT JOIN public.user_metrics um ON um.user_id = ur.user_id
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
    -- round_robin: fewest active leads
    SELECT ur.user_id INTO v_rep_id
    FROM public.user_roles ur
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
$$;

-- 7. Follow-up auto-setting function
CREATE OR REPLACE FUNCTION public.set_followup_on_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Set followup when assigned_to changes (new assignment)
  IF (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) AND NEW.assigned_to IS NOT NULL THEN
    NEW.next_followup_due := NOW() + INTERVAL '24 hours';
  END IF;

  -- Set followup when status changes to 'contacted'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'contacted' THEN
    NEW.next_followup_due := NOW() + INTERVAL '24 hours';
  END IF;

  RETURN NEW;
END;
$$;

-- 8. Log status changes function
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_activity_log (lead_id, user_id, activity_type, content)
    VALUES (NEW.id, auth.uid(), 'status_change', 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;

  -- Log assignment change
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.lead_activity_log (lead_id, user_id, activity_type, content)
    VALUES (NEW.id, auth.uid(), 'assignment', 'Lead manually assigned');
  END IF;

  -- Log quote submission
  IF OLD.quote_status IS DISTINCT FROM NEW.quote_status THEN
    IF NEW.quote_status = 'pending_approval' THEN
      INSERT INTO public.lead_activity_log (lead_id, user_id, activity_type, content)
      VALUES (NEW.id, auth.uid(), 'quote_submitted', 'Quote of $' || COALESCE(NEW.quote_amount::text, '0') || ' submitted for approval');
    ELSIF NEW.quote_status = 'approved' THEN
      INSERT INTO public.lead_activity_log (lead_id, user_id, activity_type, content)
      VALUES (NEW.id, auth.uid(), 'quote_approved', 'Quote of $' || COALESCE(NEW.quote_amount::text, '0') || ' approved');
    ELSIF NEW.quote_status = 'rejected' THEN
      INSERT INTO public.lead_activity_log (lead_id, user_id, activity_type, content)
      VALUES (NEW.id, auth.uid(), 'quote_rejected', 'Quote rejected: ' || COALESCE(NEW.quote_rejected_reason, 'No reason'));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 9. Create triggers
CREATE TRIGGER auto_assign_on_insert
  BEFORE INSERT ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_lead();

CREATE TRIGGER set_followup_on_assignment_or_contact
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_followup_on_update();

CREATE TRIGGER log_quote_status_change
  AFTER UPDATE ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_status_change();
