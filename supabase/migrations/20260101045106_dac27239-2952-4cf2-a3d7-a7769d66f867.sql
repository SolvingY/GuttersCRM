-- Allow all authenticated users to view roles for leaderboard purposes
-- This is safe because user_roles only contains user_id and role (no PII)
CREATE POLICY "Authenticated users can view all roles for leaderboard"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);