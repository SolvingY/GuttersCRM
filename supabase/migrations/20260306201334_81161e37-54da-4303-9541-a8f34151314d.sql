
-- Drop the old step_type check constraint
ALTER TABLE onboarding_steps DROP CONSTRAINT onboarding_steps_step_type_check;

-- Add new check constraint with all needed types
ALTER TABLE onboarding_steps ADD CONSTRAINT onboarding_steps_step_type_check
  CHECK (step_type = ANY (ARRAY['policy_ack','info_review','document_upload','tool_setup','training','assessment','document_sign','inline_form','confirmation']));

-- Clear old data
DELETE FROM user_onboarding_progress;
DELETE FROM onboarding_steps;

-- Insert 14 new steps
INSERT INTO onboarding_steps (step_key, step_name, step_type, required, sort_order, description) VALUES
  ('contract_sign', 'Contract Reviewed & Signed', 'document_sign', true, 1, 'Review and sign your offer letter/contract from NextGen Roofing.'),
  ('w9_form', 'W-9 Form', 'inline_form', true, 2, 'Complete your W-9 tax form for payment processing.'),
  ('model_release', 'Model Release', 'inline_form', true, 3, 'Sign the model release and image rights waiver.'),
  ('direct_deposit', 'Direct Deposit Form', 'inline_form', true, 4, 'Set up your direct deposit for payroll.'),
  ('google_email', 'Google Email Setup', 'confirmation', true, 5, 'Confirm you have received your @nextgenroofing.com email credentials.'),
  ('setup_giddy_up', 'Add to Giddy Up', 'tool_setup', true, 6, 'Confirm you have been added to the Giddy Up platform.'),
  ('setup_time_tree', 'Add to Time Tree', 'tool_setup', true, 7, 'Confirm you have been added to Time Tree for scheduling.'),
  ('setup_lead_scout', 'Add to Lead Scout', 'tool_setup', true, 8, 'Confirm you have been added to Lead Scout.'),
  ('setup_discord', 'Add to Discord', 'tool_setup', true, 9, 'Confirm you have joined the NextGen Roofing Discord server.'),
  ('setup_hail_trace', 'Add to Hail Trace', 'tool_setup', true, 10, 'Confirm you have been added to Hail Trace for storm tracking.'),
  ('group_chat', 'Group Chat (iMessage)', 'confirmation', true, 11, 'Confirm you have been added to the team group chat.'),
  ('uniform', 'Uniform', 'confirmation', false, 12, 'Confirm you have received or ordered your NextGen Roofing uniform.'),
  ('sales_materials', 'Sales Materials & Resources', 'confirmation', false, 13, 'Confirm you have received all sales materials and resources.'),
  ('tools_insurance', 'Tools & Insurance Requirements', 'policy_ack', true, 14, 'Review and acknowledge the tools and insurance requirements.');

-- Re-mark existing users as onboarding complete
UPDATE profiles SET onboarding_complete = true, onboarding_completed_at = COALESCE(onboarding_completed_at, now()) WHERE onboarding_complete IS NOT true OR onboarding_complete = false;

-- Create offer_letter_templates table
CREATE TABLE IF NOT EXISTS offer_letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_title text NOT NULL,
  template_content text NOT NULL,
  pay_structure_description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE offer_letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage offer letter templates"
  ON offer_letter_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create contractor_offer_letters table
CREATE TABLE IF NOT EXISTS contractor_offer_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES profiles(id) NOT NULL,
  template_id uuid REFERENCES offer_letter_templates(id),
  position_title text NOT NULL,
  start_date date,
  pay_structure text,
  additional_terms text,
  letter_content text,
  file_path text,
  file_url text,
  status text NOT NULL DEFAULT 'pending_review',
  sent_at timestamptz DEFAULT now(),
  signed_at timestamptz,
  signed_by_name text,
  declined_at timestamptz,
  admin_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contractor_offer_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage offer letters"
  ON contractor_offer_letters FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own offer letters"
  ON contractor_offer_letters FOR SELECT
  USING (contractor_id = auth.uid());

CREATE POLICY "Users can update own offer letters"
  ON contractor_offer_letters FOR UPDATE
  USING (contractor_id = auth.uid());

-- Seed default template
INSERT INTO offer_letter_templates (position_title, template_content, pay_structure_description)
VALUES (
  'Sales Representative',
  E'Dear {{contractor_name}},\n\nWe are pleased to extend this offer of employment for the position of {{position_title}} at NextGen Roofing.\n\nStart Date: {{start_date}}\n\nCompensation:\n{{pay_structure}}\n\nAs a member of our team, you will be expected to uphold the highest standards of professionalism and integrity. You will receive comprehensive training and support to ensure your success.\n\nThis offer is contingent upon successful completion of all onboarding requirements.\n\nWe look forward to having you on the NextGen Roofing team!\n\nSincerely,\nNextGen Roofing Management',
  'Commission-based compensation with base retainer. Details to be discussed during onboarding.'
);
