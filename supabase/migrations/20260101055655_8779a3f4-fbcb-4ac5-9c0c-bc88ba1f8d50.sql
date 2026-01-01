-- Create a secure verification function for invite codes
-- This replaces the permissive SELECT policy that exposed all invitation data

CREATE OR REPLACE FUNCTION public.verify_invite_code(
  _invite_code TEXT,
  _email TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  error_message TEXT,
  preset_display_name TEXT,
  preset_sales_rank TEXT,
  preset_yearly_goal NUMERIC,
  preset_role app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_record RECORD;
BEGIN
  SELECT * INTO inv_record
  FROM public.invitations
  WHERE invite_code = UPPER(_invite_code)
    AND LOWER(email) = LOWER(_email);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid invite code or email mismatch'::TEXT, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::app_role;
    RETURN;
  END IF;
  
  IF inv_record.is_used THEN
    RETURN QUERY SELECT false, 'Invite code already used'::TEXT, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::app_role;
    RETURN;
  END IF;
  
  IF inv_record.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 'Invite code expired'::TEXT, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::app_role;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true, 
    NULL::TEXT, 
    inv_record.preset_display_name, 
    inv_record.preset_sales_rank, 
    inv_record.preset_yearly_goal,
    inv_record.preset_role;
END;
$$;

-- Drop the overly permissive policy that exposes all invitation data
DROP POLICY IF EXISTS "Anyone can verify invite codes" ON public.invitations;