-- Update existing data with new formula, excluding canvassers
UPDATE public.user_metrics um
SET points = (FLOOR(COALESCE(sales, 0) / 10000) * 10) + 
             (COALESCE(closed_deals, 0) * 10)
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = um.user_id AND ur.role = 'canvasser'
);

UPDATE public.weekly_user_metrics wum
SET points_earned = (FLOOR(COALESCE(sales, 0) / 10000) * 10) + 
                    (COALESCE(closed_deals, 0) * 10)
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = wum.user_id AND ur.role = 'canvasser'
);