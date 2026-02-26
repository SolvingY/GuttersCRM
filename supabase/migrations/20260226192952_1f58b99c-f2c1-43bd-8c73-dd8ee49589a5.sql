ALTER TABLE public.canvasser_shifts
  ADD COLUMN conversations_had integer,
  ADD COLUMN not_interested integer,
  ADD COLUMN leads_set integer;