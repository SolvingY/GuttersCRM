-- Add office role to enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'office';

-- Unified shift table for sales reps, supplementers, and office staff
CREATE TABLE public.role_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL,
  clock_in_at timestamptz NOT NULL DEFAULT now(),
  clock_out_at timestamptz,
  clock_in_lat double precision,
  clock_in_lng double precision,
  clock_out_lat double precision,
  clock_out_lng double precision,
  hours_worked numeric,
  status text NOT NULL DEFAULT 'active',
  notes text,
  flagged_reason text,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shifts"
  ON public.role_shifts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all shifts"
  ON public.role_shifts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_shifts_one_active
  ON role_shifts (user_id)
  WHERE clock_out_at IS NULL;