-- Add hidden_from_leaderboard column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hidden_from_leaderboard boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.hidden_from_leaderboard IS 'When true, user stats are excluded from all leaderboard displays';