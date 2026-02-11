
-- Create sequence for reference numbers
CREATE SEQUENCE IF NOT EXISTS quote_request_sequence START 1;

-- Function to generate reference numbers
CREATE OR REPLACE FUNCTION public.generate_reference_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := EXTRACT(YEAR FROM NOW())::TEXT;
  seq_num := nextval('quote_request_sequence');
  RETURN 'NGR-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create quote_requests table
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  service_type TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Oklahoma',
  zip_code TEXT NOT NULL,
  best_contact_time TEXT[] DEFAULT '{}',
  referral_source TEXT,
  
  status TEXT NOT NULL DEFAULT 'new',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  
  photo_urls TEXT[] DEFAULT '{}',
  reference_number TEXT UNIQUE DEFAULT public.generate_reference_number(),
  
  contacted_at TIMESTAMPTZ,
  quoted_at TIMESTAMPTZ,
  quote_amount NUMERIC(10,2),
  quote_approved BOOLEAN DEFAULT FALSE,
  quote_approved_by UUID,
  quote_approved_at TIMESTAMPTZ,
  quote_sent_at TIMESTAMPTZ,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason TEXT,
  
  last_followup_at TIMESTAMPTZ,
  next_followup_due TIMESTAMPTZ,
  followup_count INTEGER NOT NULL DEFAULT 0,
  
  admin_notes TEXT
);

-- Indexes
CREATE INDEX idx_quote_requests_status ON public.quote_requests (status);
CREATE INDEX idx_quote_requests_created_at ON public.quote_requests (created_at DESC);
CREATE INDEX idx_quote_requests_assigned_to ON public.quote_requests (assigned_to);
CREATE INDEX idx_quote_requests_service_type ON public.quote_requests (service_type);
CREATE INDEX idx_quote_requests_reference_number ON public.quote_requests (reference_number);
CREATE INDEX idx_quote_requests_priority ON public.quote_requests (priority);

-- Enable RLS
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can submit quote requests"
  ON public.quote_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all quote requests"
  ON public.quote_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update quote requests"
  ON public.quote_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete quote requests"
  ON public.quote_requests FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Assigned users can view their leads"
  ON public.quote_requests FOR SELECT
  USING (assigned_to = auth.uid());

-- Auto-priority trigger
CREATE OR REPLACE FUNCTION public.set_quote_priority()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.form_data->>'timeline' IN ('Urgent (within 1 week)')
     OR NEW.form_data->>'urgency' IN ('Emergency (active leak/damage)', 'Urgent (within a few days)') THEN
    NEW.priority := 'urgent';
  ELSIF NEW.form_data->>'timeline' IN ('Soon (1-4 weeks)')
     OR NEW.form_data->>'urgency' IN ('Soon (within 1-2 weeks)') THEN
    NEW.priority := 'high';
  ELSE
    NEW.priority := 'normal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_quote_priority_on_insert
  BEFORE INSERT ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_quote_priority();

-- Updated_at trigger
CREATE TRIGGER update_quote_requests_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for quote photos
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-photos', 'quote-photos', true);

-- Storage policies
CREATE POLICY "Anyone can upload quote photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quote-photos');

CREATE POLICY "Anyone can view quote photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quote-photos');

CREATE POLICY "Admins can delete quote photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'quote-photos' AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));
