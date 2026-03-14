-- New private storage bucket for invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-invoices', 'job-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: admin only
CREATE POLICY "Admins can upload invoices"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-invoices' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can read invoices"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-invoices' AND
  public.has_role(auth.uid(), 'admin')
);

-- Profitability table
CREATE TABLE public.job_profitability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid REFERENCES gutter_estimates(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES quote_requests(id) ON DELETE SET NULL,
  quoted_price numeric NOT NULL DEFAULT 0,
  commission_paid numeric NOT NULL DEFAULT 0,
  material_cost numeric NOT NULL DEFAULT 0,
  labor_cost numeric NOT NULL DEFAULT 0,
  other_costs numeric NOT NULL DEFAULT 0,
  other_costs_description text,
  invoice_urls text[] NOT NULL DEFAULT '{}',
  gross_profit numeric GENERATED ALWAYS AS (
    quoted_price - commission_paid - material_cost - labor_cost - other_costs
  ) STORED,
  profit_margin_pct numeric GENERATED ALWAYS AS (
    CASE WHEN quoted_price > 0
    THEN ROUND(((quoted_price - commission_paid - material_cost - labor_cost - other_costs) / quoted_price * 100)::numeric, 2)
    ELSE 0 END
  ) STORED,
  notes text,
  entered_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_profitability_estimate_id_key UNIQUE (estimate_id)
);

ALTER TABLE public.job_profitability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only - select"
  ON public.job_profitability FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins only - insert"
  ON public.job_profitability FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins only - update"
  ON public.job_profitability FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));