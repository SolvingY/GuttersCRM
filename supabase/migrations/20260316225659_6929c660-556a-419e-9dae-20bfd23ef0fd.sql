CREATE TABLE IF NOT EXISTS prospect_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvasser_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  address text,
  city text,
  state text DEFAULT 'Oklahoma',
  zip text,
  status text NOT NULL DEFAULT 'not_home',
  notes text,
  photo_urls text[] DEFAULT '{}',
  quote_request_id uuid REFERENCES quote_requests(id) ON DELETE SET NULL,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_pins_canvasser_id ON prospect_pins(canvasser_id);
CREATE INDEX idx_prospect_pins_status ON prospect_pins(status);
CREATE INDEX idx_prospect_pins_pinned_at ON prospect_pins(pinned_at DESC);

ALTER TABLE prospect_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Canvassers manage own pins"
  ON prospect_pins FOR ALL TO authenticated
  USING (
    canvasser_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (canvasser_id = auth.uid());

ALTER TABLE prospect_pins REPLICA IDENTITY FULL;