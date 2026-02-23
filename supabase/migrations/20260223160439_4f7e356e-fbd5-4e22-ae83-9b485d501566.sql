
ALTER TABLE public.quote_requests ADD COLUMN cancelled_at timestamptz;
ALTER TABLE public.quote_requests ADD COLUMN cancelled_reason text;
