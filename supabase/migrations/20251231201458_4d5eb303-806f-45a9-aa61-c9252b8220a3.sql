-- Allow users to update their own display_name in user_metrics
CREATE POLICY "Users can update their own display_name"
ON public.user_metrics
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());