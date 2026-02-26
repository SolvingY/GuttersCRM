
-- Create notification_routing table
CREATE TABLE public.notification_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  email text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (notification_type, email)
);

ALTER TABLE public.notification_routing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notification routing"
  ON public.notification_routing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed current hardcoded recipients
INSERT INTO public.notification_routing (notification_type, email) VALUES
  ('new_application', 'm.fowler@oknextgen.com'),
  ('new_application', 'j.whitton@oknextgen.com'),
  ('new_application', 'k.jameson@oknextgen.com'),
  ('new_lead', 'j.whitton@oknextgen.com'),
  ('new_lead', 'k.jameson@oknextgen.com'),
  ('new_lead', 'a.Whisman@oknextgen.com'),
  ('new_lead', 'adam@grateful-services.com'),
  ('lead_assigned', 'j.whitton@oknextgen.com'),
  ('lead_assigned', 'k.jameson@oknextgen.com'),
  ('lead_assigned', 'a.Whisman@oknextgen.com'),
  ('lead_assigned', 'adam@grateful-services.com'),
  ('flagged_shift', 'm.fowler@oknextgen.com'),
  ('flagged_shift', 'j.whitton@oknextgen.com'),
  ('auto_clockout', 'm.fowler@oknextgen.com'),
  ('auto_clockout', 'j.whitton@oknextgen.com');
