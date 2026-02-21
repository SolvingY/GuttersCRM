
-- Scheduling columns on quote_requests
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS install_date date;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS install_time_window text;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS install_notes text;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS install_scheduled_at timestamptz;

-- Job closeout
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Canvasser link
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS canvasser_id uuid;

-- Payments table
CREATE TABLE IF NOT EXISTS lead_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES quote_requests(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_method text,
  payment_date date,
  reference_number text,
  logged_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lead_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps can manage own lead payments"
  ON lead_payments FOR ALL
  USING (auth.uid() = logged_by);

CREATE POLICY "Admins can manage all payments"
  ON lead_payments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reps can view payments on own leads"
  ON lead_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quote_requests
      WHERE id = lead_payments.lead_id
      AND assigned_to = auth.uid()
    )
  );
