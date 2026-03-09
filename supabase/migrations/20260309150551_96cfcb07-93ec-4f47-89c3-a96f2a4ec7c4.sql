
CREATE TABLE public.canvasser_zone_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvasser_id uuid NOT NULL,
  zone_id uuid NOT NULL REFERENCES public.geofence_work_zones(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  UNIQUE (canvasser_id, zone_id)
);

ALTER TABLE public.canvasser_zone_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage zone assignments" ON public.canvasser_zone_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own zone assignments" ON public.canvasser_zone_assignments FOR SELECT USING (canvasser_id = auth.uid());
