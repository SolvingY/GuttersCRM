
-- Create geofence work zones table
CREATE TABLE public.geofence_work_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geofence_work_zones ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read zones (canvassers need to check against them)
CREATE POLICY "Authenticated users can view work zones"
  ON public.geofence_work_zones
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can manage zones (insert/update/delete)
CREATE POLICY "Admins can manage work zones"
  ON public.geofence_work_zones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );
