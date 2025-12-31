-- Add prize columns for 2nd and 3rd place
ALTER TABLE public.contests ADD COLUMN prize_2nd_value numeric DEFAULT 0;
ALTER TABLE public.contests ADD COLUMN prize_2nd_description text;
ALTER TABLE public.contests ADD COLUMN prize_3rd_value numeric DEFAULT 0;
ALTER TABLE public.contests ADD COLUMN prize_3rd_description text;