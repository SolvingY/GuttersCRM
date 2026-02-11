
-- Change dna_score from integer to numeric
ALTER TABLE public.job_applications 
  ALTER COLUMN dna_score TYPE numeric(5,1);

-- Scale existing scores from /20 to /30
UPDATE public.job_applications 
SET dna_score = ROUND((dna_score / 20.0) * 30, 1)
WHERE dna_score IS NOT NULL 
  AND dna_score <= 20;

-- Update alignment_category values to new names
UPDATE public.job_applications SET alignment_category = 'Excellent Fit' WHERE alignment_category = 'High Performance';
UPDATE public.job_applications SET alignment_category = 'Moderate Fit' WHERE alignment_category = 'Mid Performance';
UPDATE public.job_applications SET alignment_category = 'Marginal Fit' WHERE alignment_category = 'Support';

-- Add new columns for hire-to-onboard flow
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS hired_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_user_id UUID,
  ADD COLUMN IF NOT EXISTS start_date DATE;
