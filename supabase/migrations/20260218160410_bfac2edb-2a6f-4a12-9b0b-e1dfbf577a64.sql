
-- Add login tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS login_count integer DEFAULT 0;

-- Create RPC function to atomically increment login count and update last_login_at
CREATE OR REPLACE FUNCTION public.increment_login_count(uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET
    login_count = COALESCE(login_count, 0) + 1,
    last_login_at = now()
  WHERE id = uid;
END;
$$;
