-- Fix handle_new_user() trigger to use explicit role count check instead of ON CONFLICT
-- This fixes the "no unique or exclusion constraint" error when creating users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv_record RECORD;
  assigned_role app_role;
  existing_role_count int;
BEGIN
  -- Insert into profiles (with ON CONFLICT since profiles.id is unique)
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  
  -- Check for invitation presets to determine role
  SELECT preset_sales_rank, preset_yearly_goal, preset_display_name, preset_role, preset_canvasser_rank
  INTO inv_record
  FROM public.invitations
  WHERE email = NEW.email
    AND is_used = TRUE
  ORDER BY used_at DESC
  LIMIT 1;
  
  -- Check if roles were already created (by create-user edge function)
  SELECT COUNT(*) INTO existing_role_count
  FROM public.user_roles
  WHERE user_id = NEW.id;
  
  -- Only create role and metrics if none exist yet
  -- (Edge function creates roles before trigger runs, so skip if already done)
  IF existing_role_count = 0 THEN
    -- Determine role: use invitation preset_role if found, otherwise default to 'user'
    IF inv_record IS NOT NULL AND inv_record.preset_role IS NOT NULL THEN
      assigned_role := inv_record.preset_role;
    ELSE
      assigned_role := 'user';
    END IF;
    
    -- Insert role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role);
    
    -- Create metrics based on assigned role
    IF assigned_role = 'canvasser' THEN
      -- Create canvasser metrics with rank from invitation
      INSERT INTO public.canvasser_metrics (user_id, display_name, metric_date, canvasser_rank)
      VALUES (
        NEW.id,
        COALESCE(inv_record.preset_display_name, NEW.raw_user_meta_data ->> 'full_name'),
        CURRENT_DATE,
        COALESCE(inv_record.preset_canvasser_rank, 'C1')
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
  END IF;
  
  RETURN NEW;
END;
$$;