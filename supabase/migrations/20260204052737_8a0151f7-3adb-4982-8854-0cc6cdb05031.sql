-- Drop the unique constraint on user_id (not just the index)
-- This allows users to have multiple role entries (e.g., both 'user' and 'canvasser')
-- The composite unique constraint on (user_id, role) already exists to prevent duplicate same-role entries
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_unique;