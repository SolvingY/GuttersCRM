
-- Add quote email snapshot column to quote_requests
ALTER TABLE public.quote_requests ADD COLUMN quote_email_snapshot TEXT;

-- Create lead_files table
CREATE TABLE public.lead_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other',
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_files_lead_id ON public.lead_files(lead_id);

ALTER TABLE public.lead_files ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all lead files"
  ON public.lead_files FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Assigned reps can view files on their leads
CREATE POLICY "Assigned reps can view lead files"
  ON public.lead_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quote_requests
    WHERE id = lead_files.lead_id AND assigned_to = auth.uid()
  ));

-- Assigned reps can upload files to their leads
CREATE POLICY "Assigned reps can upload lead files"
  ON public.lead_files FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.quote_requests
      WHERE id = lead_files.lead_id AND assigned_to = auth.uid()
    )
  );

-- Assigned reps can delete their own uploaded files
CREATE POLICY "Assigned reps can delete own lead files"
  ON public.lead_files FOR DELETE
  USING (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.quote_requests
      WHERE id = lead_files.lead_id AND assigned_to = auth.uid()
    )
  );

-- Create lead-files storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-files', 'lead-files', false);

-- Storage policies for lead-files bucket
CREATE POLICY "Authenticated users can upload lead files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lead-files');

CREATE POLICY "Authenticated users can read lead files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lead-files');

CREATE POLICY "Admins can delete lead files from storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lead-files' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own lead files from storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'lead-files' AND auth.uid()::text = (storage.foldername(name))[1]);
