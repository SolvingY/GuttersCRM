CREATE TABLE lead_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL CHECK (entry_type IN (
    'canvasser_lead_set','canvasser_lead_closed','rep_canvass_lead','rep_canvass_contract'
  )),
  week_start date NOT NULL,
  week_end date NOT NULL,
  canvasser_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sales_rep_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  entered_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_attr_canvasser ON lead_attributions(canvasser_id, week_start);
CREATE INDEX idx_lead_attr_rep ON lead_attributions(sales_rep_id, week_start);
CREATE INDEX idx_lead_attr_pairing ON lead_attributions(canvasser_id, sales_rep_id, week_start);

ALTER TABLE lead_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attributions" ON lead_attributions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users view own attributions" ON lead_attributions
  FOR SELECT USING (auth.uid() = canvasser_id OR auth.uid() = sales_rep_id);

CREATE OR REPLACE VIEW canvasser_rep_close_rates AS
SELECT
  la.canvasser_id,
  cp.full_name AS canvasser_name,
  la.sales_rep_id,
  rp.full_name AS rep_name,
  la.week_start,
  COALESCE(SUM(CASE WHEN la.entry_type = 'canvasser_lead_set' THEN la.quantity END), 0) AS leads_set,
  COALESCE(SUM(CASE WHEN la.entry_type = 'canvasser_lead_closed' THEN la.quantity END), 0) AS leads_closed,
  COALESCE(SUM(CASE WHEN la.entry_type IN ('rep_canvass_lead') THEN la.quantity END), 0) AS rep_canvass_leads,
  COALESCE(SUM(CASE WHEN la.entry_type IN ('rep_canvass_contract') THEN la.quantity END), 0) AS rep_canvass_contracts,
  CASE
    WHEN SUM(CASE WHEN la.entry_type = 'canvasser_lead_set' THEN la.quantity END) > 0
    THEN ROUND(
      SUM(CASE WHEN la.entry_type = 'canvasser_lead_closed' THEN la.quantity END)::numeric /
      SUM(CASE WHEN la.entry_type = 'canvasser_lead_set' THEN la.quantity END) * 100, 1)
    ELSE 0
  END AS close_rate_pct
FROM lead_attributions la
JOIN profiles cp ON cp.id = la.canvasser_id
JOIN profiles rp ON rp.id = la.sales_rep_id
GROUP BY la.canvasser_id, cp.full_name, la.sales_rep_id, rp.full_name, la.week_start;