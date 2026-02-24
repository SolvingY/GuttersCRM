CREATE OR REPLACE FUNCTION public.set_followup_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Clear followup when lead reaches won or terminal statuses
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('won', 'scheduled', 'completed', 'lost', 'cancelled') THEN
    NEW.next_followup_due := NULL;
    RETURN NEW;
  END IF;

  -- Set followup when assigned_to changes (new assignment)
  IF (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) AND NEW.assigned_to IS NOT NULL THEN
    NEW.next_followup_due := NOW() + INTERVAL '24 hours';
  END IF;

  -- Set followup when status changes to 'contacted'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'contacted' THEN
    NEW.next_followup_due := NOW() + INTERVAL '24 hours';
  END IF;

  RETURN NEW;
END;
$function$;