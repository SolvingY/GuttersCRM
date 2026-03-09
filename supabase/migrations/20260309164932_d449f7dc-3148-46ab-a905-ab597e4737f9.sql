
CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON public.login_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all login history"
  ON public.login_history FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert own login"
  ON public.login_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_logged_in_at ON public.login_history(logged_in_at DESC);
