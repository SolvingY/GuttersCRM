
-- Create the lead_forms table
CREATE TABLE public.lead_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  form_type text NOT NULL,
  form_data jsonb NOT NULL DEFAULT '{}',
  status text DEFAULT 'draft',
  signed_by_name text,
  signed_at timestamptz,
  signature_data text,
  rep_signature_data text,
  pdf_path text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;

-- RLS: Reps can manage forms on their assigned leads or forms they created
CREATE POLICY "Reps can manage forms on their leads"
  ON public.lead_forms FOR ALL
  USING (
    auth.uid() = created_by OR EXISTS (
      SELECT 1 FROM public.quote_requests 
      WHERE id = lead_forms.lead_id 
      AND assigned_to = auth.uid()
    )
  );

-- RLS: Admins can manage all forms
CREATE POLICY "Admins can manage all forms"
  ON public.lead_forms FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS: Canvassers can manage forms they created
CREATE POLICY "Canvassers can manage forms they created"
  ON public.lead_forms FOR ALL
  USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_lead_forms_updated_at
  BEFORE UPDATE ON public.lead_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
