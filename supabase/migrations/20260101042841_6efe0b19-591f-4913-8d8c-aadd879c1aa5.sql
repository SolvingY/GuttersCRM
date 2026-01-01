-- Step 1: Deduplicate user_roles - keep highest priority role per user
-- Priority: admin (1) > canvasser (2) > user (3)
WITH ranked_roles AS (
  SELECT 
    id,
    user_id,
    role,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1 
          WHEN 'canvasser' THEN 2 
          WHEN 'user' THEN 3 
        END
    ) as rn
  FROM public.user_roles
),
roles_to_delete AS (
  SELECT id FROM ranked_roles WHERE rn > 1
)
DELETE FROM public.user_roles 
WHERE id IN (SELECT id FROM roles_to_delete);

-- Step 2: Add unique constraint on user_id to prevent duplicates
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Step 3: Clean up canvasser_metrics for users who are NOT canvassers
DELETE FROM public.canvasser_metrics cm
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = cm.user_id AND ur.role = 'canvasser'
);

-- Step 4: Clean up weekly_canvasser_metrics for users who are NOT canvassers
DELETE FROM public.weekly_canvasser_metrics wcm
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = wcm.user_id AND ur.role = 'canvasser'
);

-- Step 5: Create validation trigger to prevent non-canvassers from having canvasser metrics
CREATE OR REPLACE FUNCTION public.validate_canvasser_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if user is a canvasser
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'canvasser') THEN
    RETURN NEW;
  END IF;
  
  -- Allow if inserting user is admin (for admin-created metrics)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RETURN NEW;
  END IF;
  
  RAISE EXCEPTION 'User is not a canvasser and cannot have canvasser metrics';
END;
$$;

CREATE TRIGGER validate_canvasser_metrics_trigger
BEFORE INSERT OR UPDATE ON public.canvasser_metrics
FOR EACH ROW
EXECUTE FUNCTION public.validate_canvasser_metrics();

CREATE TRIGGER validate_weekly_canvasser_metrics_trigger
BEFORE INSERT OR UPDATE ON public.weekly_canvasser_metrics
FOR EACH ROW
EXECUTE FUNCTION public.validate_canvasser_metrics();

-- Step 6: Create validation trigger to prevent canvassers from having user metrics
CREATE OR REPLACE FUNCTION public.validate_user_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block if user is a canvasser (canvassers shouldn't have sales metrics)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'canvasser') THEN
    -- Allow if inserting user is admin
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Canvassers cannot have sales user metrics';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_user_metrics_trigger
BEFORE INSERT OR UPDATE ON public.user_metrics
FOR EACH ROW
EXECUTE FUNCTION public.validate_user_metrics();

CREATE TRIGGER validate_weekly_user_metrics_trigger
BEFORE INSERT OR UPDATE ON public.weekly_user_metrics
FOR EACH ROW
EXECUTE FUNCTION public.validate_user_metrics();