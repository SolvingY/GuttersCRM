-- Add icon column for emoji icons
ALTER TABLE public.contests 
ADD COLUMN IF NOT EXISTS icon text DEFAULT '🏆';

-- Add winner tracking columns
ALTER TABLE public.contests 
ADD COLUMN IF NOT EXISTS winner_user_id uuid,
ADD COLUMN IF NOT EXISTS winner_display_name text,
ADD COLUMN IF NOT EXISTS winner_value numeric;