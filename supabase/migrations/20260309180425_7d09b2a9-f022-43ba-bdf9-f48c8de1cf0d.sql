DROP VIEW IF EXISTS canvasser_rep_close_rates;

CREATE OR REPLACE VIEW canvasser_rep_close_rates WITH (security_invoker = true) AS
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