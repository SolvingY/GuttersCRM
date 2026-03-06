
CREATE OR REPLACE FUNCTION public.check_onboarding_complete(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_required int;
  v_completed int;
  v_complete boolean;
BEGIN
  SELECT COUNT(*) INTO v_total_required
  FROM onboarding_steps
  WHERE required = true AND is_active = true;

  SELECT COUNT(*) INTO v_completed
  FROM user_onboarding_progress uop
  JOIN onboarding_steps os ON os.id = uop.step_id
  WHERE uop.user_id = p_user_id
    AND os.required = true
    AND os.is_active = true
    AND uop.status = 'completed';

  v_complete := (v_total_required > 0 AND v_completed >= v_total_required);

  IF v_complete THEN
    UPDATE profiles SET onboarding_complete = true, onboarding_completed_at = now()
    WHERE id = p_user_id AND onboarding_complete IS NOT true;
  END IF;

  RETURN v_complete;
END;
$$;
