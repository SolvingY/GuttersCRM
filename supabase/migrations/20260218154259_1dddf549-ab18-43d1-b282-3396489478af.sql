
-- 1. Add dna_assessment_pending column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dna_assessment_pending boolean DEFAULT false;

-- 2. Create contractor_files table
CREATE TABLE IF NOT EXISTS public.contractor_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.contractor_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contractor files"
  ON public.contractor_files FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own contractor files"
  ON public.contractor_files FOR SELECT
  USING (user_id = auth.uid());

-- 3. Create contractor-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contractor-files', 'contractor-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Admins can upload contractor files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contractor-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read contractor files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contractor-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read own contractor files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contractor-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete contractor files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contractor-files' AND has_role(auth.uid(), 'admin'::app_role));
