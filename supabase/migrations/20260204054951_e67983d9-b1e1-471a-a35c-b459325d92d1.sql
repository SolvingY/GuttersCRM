-- Update validate_user_metrics() to allow dual-role users (users with both 'user' and 'canvasser' roles)
CREATE OR REPLACE FUNCTION public.validate_user_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if user has the 'user' role (sales rep) - this includes dual-role users
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'user') THEN
    RETURN NEW;
  END IF;
  
  -- Allow if user has admin role (admins can have sales metrics even without 'user' role)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin') THEN
    RETURN NEW;
  END IF;
  
  -- Allow if the inserting user is an admin (for admin-created metrics)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN NEW;
  END IF;
  
  -- Block canvasser-only users from having sales metrics
  RAISE EXCEPTION 'User must have sales rep role to access sales metrics';
END;
$$;