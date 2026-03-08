CREATE TABLE public.admin_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  default_landing_page text NOT NULL DEFAULT '/admin/overview',
  visible_menu_items jsonb DEFAULT '[]',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.admin_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage presets" ON public.admin_presets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));