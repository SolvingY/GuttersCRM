ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS interview_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS applicant_source text,
  ADD COLUMN IF NOT EXISTS desired_role text,
  ADD COLUMN IF NOT EXISTS routing_notified_at timestamptz;

CREATE TABLE IF NOT EXISTS canvasser_eod_report_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  canvassers_included integer NOT NULL DEFAULT 0,
  recipients jsonb NOT NULL DEFAULT '[]',
  email_sent_at timestamptz,
  resend_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE canvasser_eod_report_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage EOD report log" ON canvasser_eod_report_log
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

ALTER TABLE canvasser_metrics ADD COLUMN IF NOT EXISTS contracts integer NOT NULL DEFAULT 0;
ALTER TABLE daily_canvasser_metric_entries ADD COLUMN IF NOT EXISTS contracts_delta integer NOT NULL DEFAULT 0;
ALTER TABLE weekly_canvasser_metrics ADD COLUMN IF NOT EXISTS contracts integer NOT NULL DEFAULT 0;