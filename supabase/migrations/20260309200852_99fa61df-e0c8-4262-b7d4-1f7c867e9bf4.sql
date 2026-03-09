
-- 1a: Add homeowner/job fields to commercial_hail_assessments
ALTER TABLE commercial_hail_assessments
  ADD COLUMN IF NOT EXISTS homeowner_name text,
  ADD COLUMN IF NOT EXISTS homeowner_phone text,
  ADD COLUMN IF NOT EXISTS homeowner_email text,
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES quote_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_finalized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS report_notes text,
  ADD COLUMN IF NOT EXISTS saved_at timestamptz;

-- 1b: Add same fields to production_checklist_submissions
ALTER TABLE production_checklist_submissions
  ADD COLUMN IF NOT EXISTS homeowner_name text,
  ADD COLUMN IF NOT EXISTS homeowner_phone text,
  ADD COLUMN IF NOT EXISTS homeowner_email text,
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES quote_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS report_finalized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS report_notes text,
  ADD COLUMN IF NOT EXISTS saved_at timestamptz;

-- 1c: Report recipients table
CREATE TABLE report_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE report_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view active recipients" ON report_recipients
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins manage recipients" ON report_recipients
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

INSERT INTO report_recipients (name, email, sort_order) VALUES
  ('Jonathan Whitton', 'j.whitton@oknextgen.com', 1),
  ('Kara Jameson', 'k.jameson@oknextgen.com', 2),
  ('Michael Beck', 'm.beck@oknextgen.com', 3),
  ('Robert Baker', 'r.baker@oknextgen.com', 4),
  ('Evan Altemus', 'e.altemus@oknextgen.com', 5),
  ('Aldo Rodriguez', 'a.rodriguez@oknextgen.com', 6);

-- 1d: Report email log
CREATE TABLE report_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_type text NOT NULL,
  submission_id uuid NOT NULL,
  sent_by uuid NOT NULL REFERENCES profiles(id),
  recipients jsonb NOT NULL DEFAULT '[]',
  sent_at timestamptz NOT NULL DEFAULT now(),
  resend_message_id text
);

ALTER TABLE report_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sent reports" ON report_email_log
  FOR SELECT USING (auth.uid() = sent_by);

CREATE POLICY "Users insert own report logs" ON report_email_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sent_by);

CREATE POLICY "Admins view all report logs" ON report_email_log
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));
