
ALTER TABLE lead_forms 
  ADD COLUMN IF NOT EXISTS signing_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS signing_ip text,
  ADD COLUMN IF NOT EXISTS customer_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_signed_name text,
  ADD COLUMN IF NOT EXISTS sent_for_signing_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS lead_forms_signing_token_idx 
  ON lead_forms(signing_token);

-- Public read access via valid signing token
CREATE POLICY "Public can view form by signing token"
  ON lead_forms FOR SELECT
  USING (
    signing_token IS NOT NULL 
    AND token_expires_at > now()
    AND status IN ('sent', 'draft')
  );

-- Public can update signature fields when status is 'sent', transitioning to 'signed'
CREATE POLICY "Public can update signature fields only"
  ON lead_forms FOR UPDATE
  USING (
    signing_token IS NOT NULL 
    AND token_expires_at > now()
    AND status = 'sent'
  )
  WITH CHECK (status = 'signed');
