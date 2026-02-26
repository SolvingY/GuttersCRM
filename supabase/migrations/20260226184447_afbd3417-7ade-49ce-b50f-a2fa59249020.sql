CREATE TABLE public.canvasser_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvasser_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clock_in_at timestamptz NOT NULL DEFAULT now(),
  clock_out_at timestamptz,
  hours_worked numeric GENERATED ALWAYS AS (
    CASE 
      WHEN clock_out_at IS NOT NULL 
      THEN ROUND(EXTRACT(EPOCH FROM (clock_out_at - clock_in_at)) / 3600.0, 2)
      ELSE NULL 
    END
  ) STORED,
  doors_knocked integer,
  notes text,
  status text DEFAULT 'active',
  flagged_reason text,
  edited_by uuid REFERENCES auth.users(id),
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.canvasser_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Canvassers can manage own shifts"
  ON public.canvasser_shifts FOR ALL
  USING (auth.uid() = canvasser_id);

CREATE POLICY "Admins can manage all shifts"
  ON public.canvasser_shifts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));