-- First, delete orphaned records with NULL user_id (test data)
DELETE FROM public.user_metrics WHERE user_id IS NULL;

-- Now restore NOT NULL constraint on user_id
ALTER TABLE public.user_metrics ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint to auth.users with CASCADE delete
ALTER TABLE public.user_metrics 
ADD CONSTRAINT user_metrics_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;