-- Add preferred_view column to profiles table for dual role support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_view text DEFAULT 'sales';

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.preferred_view IS 'User preferred view: sales or canvasser (for dual-role users)';