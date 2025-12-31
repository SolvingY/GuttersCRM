-- Add earnings_ytd column to user_metrics
ALTER TABLE public.user_metrics 
ADD COLUMN IF NOT EXISTS earnings_ytd NUMERIC DEFAULT 0;

-- Add preset columns to invitations table
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS preset_sales_rank TEXT DEFAULT 'SR1',
ADD COLUMN IF NOT EXISTS preset_yearly_goal NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS preset_display_name TEXT;

-- Create trigger function to auto-mark invitations as used on signup
CREATE OR REPLACE FUNCTION public.handle_invitation_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invitations
  SET is_used = TRUE, used_at = NOW()
  WHERE email = NEW.email
    AND is_used = FALSE
    AND expires_at > NOW();
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for invitation handling
DROP TRIGGER IF EXISTS on_auth_user_created_invitation ON auth.users;
CREATE TRIGGER on_auth_user_created_invitation
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_invitation_on_signup();

-- Update handle_new_user function to use invitation presets
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_record RECORD;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Check for invitation presets
  SELECT preset_sales_rank, preset_yearly_goal, preset_display_name
  INTO inv_record
  FROM public.invitations
  WHERE email = NEW.email
    AND is_used = TRUE
  ORDER BY used_at DESC
  LIMIT 1;
  
  -- Create initial user_metrics with invitation presets or defaults
  INSERT INTO public.user_metrics (user_id, display_name, sales_rank, yearly_goal, metric_date)
  VALUES (
    NEW.id,
    COALESCE(inv_record.preset_display_name, NEW.raw_user_meta_data ->> 'full_name'),
    COALESCE(inv_record.preset_sales_rank, 'SR1'),
    COALESCE(inv_record.preset_yearly_goal, 0),
    CURRENT_DATE
  );
  
  RETURN NEW;
END;
$$;