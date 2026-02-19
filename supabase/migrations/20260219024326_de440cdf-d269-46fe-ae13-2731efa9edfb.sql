
CREATE TABLE public.gutter_estimates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             uuid REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  job_number          text,
  customer_name       text,
  city                text,
  state               text,
  protection_product  text,
  protection_footage  numeric DEFAULT 0,
  protection_retail   numeric DEFAULT 0,
  protection_floor    numeric DEFAULT 0,
  gutter_size         text,
  gutter_color        text,
  gutter_footage      numeric DEFAULT 0,
  gutter_retail       numeric DEFAULT 0,
  gutter_floor        numeric DEFAULT 0,
  downspout_footage   numeric DEFAULT 0,
  elbow_footage       numeric DEFAULT 0,
  ds_elbow_retail     numeric DEFAULT 0,
  ds_elbow_floor      numeric DEFAULT 0,
  addon_retail        numeric DEFAULT 0,
  addon_floor         numeric DEFAULT 0,
  total_retail        numeric DEFAULT 0,
  total_floor         numeric DEFAULT 0,
  quoted_price        numeric DEFAULT 0,
  commission          numeric DEFAULT 0,
  measurement_data    jsonb DEFAULT '{}',
  created_by          uuid DEFAULT auth.uid(),
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE public.gutter_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own estimates"
  ON public.gutter_estimates FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own estimates"
  ON public.gutter_estimates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own estimates"
  ON public.gutter_estimates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all estimates"
  ON public.gutter_estimates FOR ALL
  USING (has_role(auth.uid(), 'admin'));
