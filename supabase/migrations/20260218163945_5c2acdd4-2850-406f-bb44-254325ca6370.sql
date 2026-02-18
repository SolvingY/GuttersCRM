
CREATE TABLE public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reviewed_by uuid NOT NULL,
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  quarter text NOT NULL,
  overall_rating integer,
  review_notes text,
  goals_set text,
  action_items text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reviews"
  ON public.performance_reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_performance_reviews_updated_at
  BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
