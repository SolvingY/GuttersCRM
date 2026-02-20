
-- ============================================================
-- BATCH 1: Database Foundation + Contractor Profile Enhancements
-- ============================================================

-- 1.1 Extend profiles table
ALTER TABLE public.profiles
  ADD COLUMN phone TEXT,
  ADD COLUMN birthday DATE,
  ADD COLUMN start_date DATE,
  ADD COLUMN street_address TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN state TEXT DEFAULT 'Oklahoma',
  ADD COLUMN zip_code TEXT,
  ADD COLUMN emergency_contact_name TEXT,
  ADD COLUMN emergency_contact_phone TEXT,
  ADD COLUMN emergency_contact_relationship TEXT,
  ADD COLUMN compensation_type TEXT,
  ADD COLUMN hourly_rate NUMERIC(10,2),
  ADD COLUMN retainer_annual NUMERIC(10,2),
  ADD COLUMN commission_percentage NUMERIC(5,2),
  ADD COLUMN profit_split_percentage NUMERIC(5,2),
  ADD COLUMN manager_id UUID;

CREATE INDEX idx_profiles_manager ON public.profiles(manager_id);
CREATE INDEX idx_profiles_start_date ON public.profiles(start_date DESC);
CREATE INDEX idx_profiles_birthday ON public.profiles(birthday);

-- Admin update policy for profiles
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 1.2 Create contractor_document_categories table
CREATE TABLE public.contractor_document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  requires_admin_upload BOOLEAN DEFAULT FALSE,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contractor_document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage document categories"
  ON public.contractor_document_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view document categories"
  ON public.contractor_document_categories FOR SELECT
  USING (true);

INSERT INTO public.contractor_document_categories (name, description, requires_admin_upload, icon, sort_order) VALUES
  ('W9', 'IRS Form W9 - Independent contractor tax documents', TRUE, 'FileText', 1),
  ('Banking', 'Direct deposit and banking information', TRUE, 'CreditCard', 2),
  ('Contracts', 'Independent contractor agreements', TRUE, 'FileSignature', 3),
  ('Offer Letters', 'Engagement letters and agreements', TRUE, 'Mail', 4),
  ('Performance Reviews', 'Quarterly performance review documents', FALSE, 'Star', 5),
  ('Certifications', 'Professional licenses and certifications', FALSE, 'Award', 6),
  ('Other', 'Miscellaneous documents', FALSE, 'Folder', 7);

-- 1.3 Extend contractor_files table
ALTER TABLE public.contractor_files
  ADD COLUMN category_id UUID REFERENCES public.contractor_document_categories(id),
  ADD COLUMN is_sensitive BOOLEAN DEFAULT FALSE,
  ADD COLUMN requires_signature BOOLEAN DEFAULT FALSE,
  ADD COLUMN signed_at TIMESTAMPTZ,
  ADD COLUMN signed_by UUID,
  ADD COLUMN description TEXT;

CREATE INDEX idx_contractor_files_category ON public.contractor_files(category_id);
CREATE INDEX idx_contractor_files_user_category ON public.contractor_files(user_id, category_id);

-- 1.4 Extend performance_reviews table
ALTER TABLE public.performance_reviews
  ADD COLUMN communication_score INTEGER,
  ADD COLUMN productivity_score INTEGER,
  ADD COLUMN quality_score INTEGER,
  ADD COLUMN teamwork_score INTEGER,
  ADD COLUMN reliability_score INTEGER,
  ADD COLUMN customer_service_score INTEGER,
  ADD COLUMN strengths TEXT,
  ADD COLUMN areas_for_improvement TEXT,
  ADD COLUMN manager_signature TEXT,
  ADD COLUMN contractor_signature TEXT,
  ADD COLUMN contractor_acknowledged_at TIMESTAMPTZ;

-- Validation trigger for score range (1-5)
CREATE OR REPLACE FUNCTION public.validate_review_scores()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.communication_score IS NOT NULL AND (NEW.communication_score < 1 OR NEW.communication_score > 5)) OR
     (NEW.productivity_score IS NOT NULL AND (NEW.productivity_score < 1 OR NEW.productivity_score > 5)) OR
     (NEW.quality_score IS NOT NULL AND (NEW.quality_score < 1 OR NEW.quality_score > 5)) OR
     (NEW.teamwork_score IS NOT NULL AND (NEW.teamwork_score < 1 OR NEW.teamwork_score > 5)) OR
     (NEW.reliability_score IS NOT NULL AND (NEW.reliability_score < 1 OR NEW.reliability_score > 5)) OR
     (NEW.customer_service_score IS NOT NULL AND (NEW.customer_service_score < 1 OR NEW.customer_service_score > 5)) THEN
    RAISE EXCEPTION 'All scores must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_scores_trigger
  BEFORE INSERT OR UPDATE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_scores();

-- Auto-calculate overall rating
CREATE OR REPLACE FUNCTION public.calculate_overall_rating()
RETURNS TRIGGER AS $$
DECLARE
  scores INTEGER[];
  avg_score NUMERIC;
BEGIN
  scores := ARRAY[
    NEW.communication_score,
    NEW.productivity_score,
    NEW.quality_score,
    NEW.teamwork_score,
    NEW.reliability_score,
    NEW.customer_service_score
  ];
  
  SELECT AVG(score) INTO avg_score
  FROM unnest(scores) AS score
  WHERE score IS NOT NULL;
  
  IF avg_score IS NOT NULL THEN
    NEW.overall_rating := ROUND(avg_score);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_calculate_rating
  BEFORE INSERT OR UPDATE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.calculate_overall_rating();
