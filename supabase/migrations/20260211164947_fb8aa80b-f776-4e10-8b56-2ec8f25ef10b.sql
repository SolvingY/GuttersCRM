
-- Create job_applications table
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  current_job_title TEXT,
  desired_position TEXT NOT NULL,
  years_experience TEXT NOT NULL,
  availability TEXT NOT NULL,
  dna_answers JSONB NOT NULL,
  dna_score INTEGER NOT NULL,
  alignment_category TEXT NOT NULL,
  recommended_role TEXT,
  red_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  narrative_ownership TEXT NOT NULL,
  narrative_mentor TEXT NOT NULL,
  narrative_why_ngr TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  status_changed_by UUID,
  status_changed_at TIMESTAMPTZ,
  admin_notes TEXT,
  interview_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  contacted_at TIMESTAMPTZ,
  archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public application form)
CREATE POLICY "Anyone can submit applications"
ON public.job_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can select
CREATE POLICY "Admins can view all applications"
ON public.job_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update applications"
ON public.job_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete applications"
ON public.job_applications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Reuse existing updated_at trigger
CREATE TRIGGER update_job_applications_updated_at
BEFORE UPDATE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_job_applications_status ON public.job_applications(status);
CREATE INDEX idx_job_applications_created_at ON public.job_applications(created_at DESC);
CREATE INDEX idx_job_applications_dna_score ON public.job_applications(dna_score DESC);
CREATE INDEX idx_job_applications_archived ON public.job_applications(archived);

-- Auto-archive function
CREATE OR REPLACE FUNCTION public.archive_old_applications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.job_applications
  SET archived = TRUE, archived_at = NOW()
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND archived = FALSE
    AND status NOT IN ('hired', 'contacted');
END;
$$;
