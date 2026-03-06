-- Add e-signature fields to mandatory_actions
ALTER TABLE mandatory_actions
  ADD COLUMN IF NOT EXISTS signature_data text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_by_name text;

-- Add signature tracking to contractor_files
ALTER TABLE contractor_files
  ADD COLUMN IF NOT EXISTS signature_data text,
  ADD COLUMN IF NOT EXISTS signed_by_name text;