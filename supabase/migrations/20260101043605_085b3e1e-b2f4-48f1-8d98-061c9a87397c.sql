-- Step 1: Add preset_role column to invitations table
ALTER TABLE public.invitations 
ADD COLUMN preset_role public.app_role NOT NULL DEFAULT 'user';

-- Step 2: Update handle_new_user trigger to use preset_role from invitation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_record RECORD;
  assigned_role app_role;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Check for invitation presets to determine role
  SELECT preset_sales_rank, preset_yearly_goal, preset_display_name, preset_role
  INTO inv_record
  FROM public.invitations
  WHERE email = NEW.email
    AND is_used = TRUE
  ORDER BY used_at DESC
  LIMIT 1;
  
  -- Determine role: use invitation preset_role if found, otherwise default to 'user'
  IF inv_record IS NOT NULL AND inv_record.preset_role IS NOT NULL THEN
    assigned_role := inv_record.preset_role;
  ELSE
    -- Check if role was already set (by create-user function)
    SELECT role INTO assigned_role
    FROM public.user_roles
    WHERE user_id = NEW.id
    LIMIT 1;
    
    IF assigned_role IS NULL THEN
      assigned_role := 'user';
    END IF;
  END IF;
  
  -- Upsert role into user_roles (handles both new and existing)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
  
  -- Create metrics based on assigned role
  IF assigned_role = 'canvasser' THEN
    -- Create canvasser metrics
    INSERT INTO public.canvasser_metrics (user_id, display_name, metric_date)
    VALUES (
      NEW.id,
      COALESCE(inv_record.preset_display_name, NEW.raw_user_meta_data ->> 'full_name'),
      CURRENT_DATE
    )
    ON CONFLICT DO NOTHING;
  ELSE
    -- Create user metrics (for 'user' and 'admin' roles)
    INSERT INTO public.user_metrics (user_id, display_name, sales_rank, yearly_goal, metric_date)
    VALUES (
      NEW.id,
      COALESCE(inv_record.preset_display_name, NEW.raw_user_meta_data ->> 'full_name'),
      COALESCE(inv_record.preset_sales_rank, 'SR1'),
      COALESCE(inv_record.preset_yearly_goal, 0),
      CURRENT_DATE
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;