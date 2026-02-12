
-- =============================================
-- Phase 1A: New columns on quote_requests
-- =============================================
ALTER TABLE public.quote_requests ADD COLUMN lead_source TEXT NOT NULL DEFAULT 'internet';
ALTER TABLE public.quote_requests ADD COLUMN lead_type TEXT NOT NULL DEFAULT 'internet';
ALTER TABLE public.quote_requests ADD COLUMN manually_created BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.quote_requests ADD COLUMN created_by UUID;
ALTER TABLE public.quote_requests ADD COLUMN counted_as_lead BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.quote_requests ADD COLUMN lead_counted_at TIMESTAMPTZ;

-- =============================================
-- Phase 1B: New columns on user_metrics
-- =============================================
ALTER TABLE public.user_metrics ADD COLUMN internet_leads INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_metrics ADD COLUMN internet_leads_closed INTEGER NOT NULL DEFAULT 0;

-- =============================================
-- Phase 1C: New ad_spend_tracking table
-- =============================================
CREATE TABLE public.ad_spend_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL UNIQUE,
  ad_spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.ad_spend_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ad spend"
  ON public.ad_spend_tracking
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_ad_spend_tracking_updated_at
  BEFORE UPDATE ON public.ad_spend_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Phase 1D: Trigger count_lead_on_assign
-- =============================================
CREATE OR REPLACE FUNCTION public.count_lead_on_assign()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when assigned_to changes to a non-null value and lead hasn't been counted yet
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
    END IF;

    NEW.counted_as_lead := TRUE;
    NEW.lead_counted_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_count_lead_on_assign
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.count_lead_on_assign();

-- =============================================
-- Phase 1E: Trigger update_lead_close_stats
-- =============================================
CREATE OR REPLACE FUNCTION public.update_lead_close_stats()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
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
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_lead_close_stats
  AFTER UPDATE ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_close_stats();

-- =============================================
-- Phase 1F: Update submit_quote_request RPC
-- =============================================
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
SET search_path TO 'public'
AS $$
DECLARE
  v_ref text;
BEGIN
  INSERT INTO public.quote_requests (
    service_type, form_data, full_name, email, phone,
    street_address, city, state, zip_code,
    best_contact_time, referral_source, photo_urls,
    lead_source, lead_type
  ) VALUES (
    p_service_type, p_form_data, p_full_name, p_email, p_phone,
    p_street_address, p_city, p_state, p_zip_code,
    p_best_contact_time, p_referral_source, p_photo_urls,
    'internet', 'internet'
  )
  RETURNING reference_number INTO v_ref;

  RETURN v_ref;
END;
$$;

-- =============================================
-- Phase 1G: New create_manual_lead RPC
-- =============================================
CREATE OR REPLACE FUNCTION public.create_manual_lead(
  p_lead_source TEXT,
  p_service_type TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_street_address TEXT,
  p_city TEXT,
  p_state TEXT DEFAULT 'Oklahoma',
  p_zip_code TEXT DEFAULT '',
  p_timeline TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ref TEXT;
  v_lead_type TEXT;
  v_form_data JSONB;
BEGIN
  -- Determine lead_type from source
  IF p_lead_source = 'phone_canvasser' THEN
    v_lead_type := 'canvasser';
  ELSE
    v_lead_type := 'internet';
  END IF;

  -- Build form_data
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
$$;

-- =============================================
-- Phase 1H: New update_ad_spend RPC
-- =============================================
CREATE OR REPLACE FUNCTION public.update_ad_spend(
  p_month DATE,
  p_ad_spend NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month DATE;
BEGIN
  v_month := DATE_TRUNC('month', p_month)::DATE;

  INSERT INTO public.ad_spend_tracking (month, ad_spend, updated_by)
  VALUES (v_month, p_ad_spend, auth.uid())
  ON CONFLICT (month) DO UPDATE
    SET ad_spend = p_ad_spend,
        updated_by = auth.uid(),
        updated_at = NOW();
END;
$$;
