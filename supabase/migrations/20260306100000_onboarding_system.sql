-- ============================================================
-- ONBOARDING SYSTEM MIGRATION
-- Adds onboarding checklist, mandatory actions, and access gating
-- ============================================================

-- 1. Add onboarding columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- 2. Onboarding step templates
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_key text UNIQUE NOT NULL,
  step_name text NOT NULL,
  step_type text NOT NULL CHECK (step_type IN ('policy_ack', 'info_review', 'document_upload', 'tool_setup', 'training', 'assessment')),
  description text,
  required boolean DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  role_applicable text[], -- NULL = all roles
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. Per-user onboarding progress
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, step_id)
);

-- 4. Mandatory actions (admin/supervisor can create, blocks access)
CREATE TABLE IF NOT EXISTS mandatory_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  action_type text NOT NULL CHECK (action_type IN ('document_upload', 'document_sign', 'info_update', 'policy_ack', 'custom')),
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  blocks_access boolean DEFAULT true,
  file_url text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user ON user_onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_status ON user_onboarding_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mandatory_actions_user ON mandatory_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_mandatory_actions_pending ON mandatory_actions(user_id, status) WHERE status = 'pending' AND blocks_access = true;

-- Updated_at trigger for mandatory_actions
CREATE TRIGGER update_mandatory_actions_updated_at
  BEFORE UPDATE ON mandatory_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. Seed onboarding steps
-- ============================================================
INSERT INTO onboarding_steps (step_key, step_name, step_type, description, required, sort_order, role_applicable) VALUES
  ('welcome_policy', 'Company Policy Acknowledgment', 'policy_ack',
   'Review and acknowledge the NextGen Roofing company policies, code of conduct, and expectations.',
   true, 1, NULL),
  ('personal_info', 'Personal Information', 'info_review',
   'Verify and complete your personal information including phone number, address, and date of birth.',
   true, 2, NULL),
  ('emergency_contact', 'Emergency Contact', 'info_review',
   'Provide emergency contact information for safety purposes.',
   true, 3, NULL),
  ('upload_w9', 'Upload W-9', 'document_upload',
   'Upload your completed W-9 tax form.',
   true, 4, NULL),
  ('upload_banking', 'Banking / Direct Deposit', 'document_upload',
   'Upload your direct deposit or banking information for compensation.',
   true, 5, NULL),
  ('upload_model_release', 'Model Release Form', 'document_upload',
   'Upload a signed model release form authorizing use of your likeness in company materials.',
   true, 6, NULL),
  ('upload_dd_form', 'DD Form', 'document_upload',
   'Upload your DD form for records.',
   true, 7, NULL),
  ('sign_offer_letter', 'Review & Sign Offer Letter', 'document_upload',
   'Review and sign your offer letter. Your admin will upload the document for your review.',
   true, 8, NULL),
  ('sign_contract', 'Review & Sign Contract', 'document_upload',
   'Review and sign your contractor agreement. Admin confirms both parties have reviewed and signed.',
   true, 9, NULL),
  ('setup_giddy_up', 'Set Up Giddy Up', 'tool_setup',
   'Confirm that your Giddy Up account has been set up and you have access.',
   true, 10, NULL),
  ('setup_time_tree', 'Set Up Time Tree', 'tool_setup',
   'Confirm that your Time Tree account has been set up and you have access.',
   true, 11, NULL),
  ('dna_assessment', 'Complete DNA Assessment', 'assessment',
   'Complete the NGR DNA cultural alignment assessment.',
   true, 12, NULL),
  ('training', 'Training', 'training',
   'Complete required training modules. (Coming soon)',
   false, 13, NULL)
ON CONFLICT (step_key) DO NOTHING;

-- ============================================================
-- 6. Mark ALL existing users as onboarding complete
-- ============================================================
UPDATE profiles
SET onboarding_complete = true,
    onboarding_completed_at = now()
WHERE onboarding_complete IS NOT true;

-- ============================================================
-- 7. RLS Policies
-- ============================================================

ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandatory_actions ENABLE ROW LEVEL SECURITY;

-- Onboarding steps: everyone can read, only admins can modify
CREATE POLICY "Anyone can view onboarding steps"
  ON onboarding_steps FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage onboarding steps"
  ON onboarding_steps FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- User onboarding progress: users see own, admins see all
CREATE POLICY "Users can view own onboarding progress"
  ON user_onboarding_progress FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own onboarding progress"
  ON user_onboarding_progress FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert onboarding progress"
  ON user_onboarding_progress FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admins can delete onboarding progress"
  ON user_onboarding_progress FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Mandatory actions: users see own, admins manage all
CREATE POLICY "Users can view own mandatory actions"
  ON mandatory_actions FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own mandatory actions"
  ON mandatory_actions FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert mandatory actions"
  ON mandatory_actions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete mandatory actions"
  ON mandatory_actions FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- 8. Function to initialize onboarding for a new user
-- ============================================================
CREATE OR REPLACE FUNCTION initialize_user_onboarding(p_user_id uuid, p_role text DEFAULT 'user')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_onboarding_progress (user_id, step_id, status)
  SELECT p_user_id, s.id, 'pending'
  FROM onboarding_steps s
  WHERE s.is_active = true
    AND (s.role_applicable IS NULL OR p_role = ANY(s.role_applicable))
  ON CONFLICT (user_id, step_id) DO NOTHING;
END;
$$;

-- ============================================================
-- 9. Function to check and mark onboarding complete
-- ============================================================
CREATE OR REPLACE FUNCTION check_onboarding_complete(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incomplete int;
  v_complete boolean;
BEGIN
  -- Count required steps that are not completed
  SELECT COUNT(*) INTO v_incomplete
  FROM user_onboarding_progress uop
  JOIN onboarding_steps os ON os.id = uop.step_id
  WHERE uop.user_id = p_user_id
    AND os.required = true
    AND uop.status != 'completed';

  v_complete := (v_incomplete = 0);

  IF v_complete THEN
    UPDATE profiles
    SET onboarding_complete = true,
        onboarding_completed_at = now()
    WHERE id = p_user_id
      AND onboarding_complete IS NOT true;
  END IF;

  RETURN v_complete;
END;
$$;
