
CREATE TABLE public.report_email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL UNIQUE,
  recipient_emails text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.report_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage report email settings" ON public.report_email_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed with default onboarding_reminder recipients
INSERT INTO public.report_email_settings (report_type, recipient_emails, is_active)
VALUES ('onboarding_reminder', ARRAY['kara@oknextgen.com', 'jonathan@oknextgen.com'], true);
