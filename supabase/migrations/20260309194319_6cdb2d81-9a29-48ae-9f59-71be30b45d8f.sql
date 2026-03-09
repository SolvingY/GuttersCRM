
-- Hail assessment submissions
CREATE TABLE public.commercial_hail_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL,

  property_name text NOT NULL,
  address text,
  inspector_name text NOT NULL,
  inspection_date date NOT NULL,
  storm_date date,

  result text,
  result_notes text,
  result_doc_link text,

  has_membrane_roof boolean,
  has_mod_bitumen boolean,
  has_metal_roof boolean,
  interior_accessible boolean,

  form_data jsonb NOT NULL DEFAULT '{}',
  photo_paths jsonb NOT NULL DEFAULT '[]',

  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_submitted_by FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT chk_result CHECK (result IS NULL OR result IN ('no_damage', 'possible_damage', 'confirmed_damage'))
);

ALTER TABLE public.commercial_hail_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own assessments" ON public.commercial_hail_assessments
  FOR ALL USING (auth.uid() = submitted_by);

CREATE POLICY "Admins view all assessments" ON public.commercial_hail_assessments
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for hail assessment photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hail-assessment-photos',
  'hail-assessment-photos',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users upload own assessment photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'hail-assessment-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users view own assessment photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hail-assessment-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins view all assessment photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hail-assessment-photos' AND
    public.has_role(auth.uid(), 'admin')
  );
