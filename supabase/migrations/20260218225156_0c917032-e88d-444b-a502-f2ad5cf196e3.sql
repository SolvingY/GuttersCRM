
-- Phase 1A: Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supplementer';

-- Phase 1B: Create supplementer_metrics table
CREATE TABLE public.supplementer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  yearly_goal NUMERIC(12,2) DEFAULT 100000,
  
  -- Primary Metrics (YTD/Cumulative)
  total_rcv_increased NUMERIC(12,2) DEFAULT 0,
  total_money_collected NUMERIC(12,2) DEFAULT 0,
  total_supplements_processed INTEGER DEFAULT 0,
  
  -- Timing Averages (in days)
  avg_coc_completion_days NUMERIC(5,2) DEFAULT 0,
  avg_depreciation_release_days NUMERIC(5,2) DEFAULT 0,
  avg_code_release_days NUMERIC(5,2) DEFAULT 0,
  avg_revised_scope_days NUMERIC(5,2) DEFAULT 0,
  
  -- Calculated Scores
  efficiency_score NUMERIC(5,2) DEFAULT 0,
  collection_rate NUMERIC(5,2) DEFAULT 0,
  
  -- Points
  points INTEGER DEFAULT 0,
  coc_bonus_points INTEGER DEFAULT 0,
  
  -- Weekly tracking
  supplements_this_week INTEGER DEFAULT 0,
  rcv_increased_this_week NUMERIC(12,2) DEFAULT 0,
  money_collected_this_week NUMERIC(12,2) DEFAULT 0,
  
  -- Weekly Reset Tracking
  last_weekly_reset TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplementer_metrics_user ON public.supplementer_metrics(user_id);

-- Phase 1C: Create supplement_jobs table
CREATE TABLE public.supplement_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Job Info
  job_number TEXT,
  client_name TEXT NOT NULL,
  property_address TEXT,
  insurance_carrier TEXT,
  claim_number TEXT,
  
  -- Assignment
  supplementer_id UUID NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Financial Metrics
  original_rcv NUMERIC(10,2) DEFAULT 0,
  statement_of_loss_rcv NUMERIC(10,2) DEFAULT 0,
  rcv_increase NUMERIC(10,2) GENERATED ALWAYS AS (statement_of_loss_rcv - original_rcv) STORED,
  
  depreciation_amount NUMERIC(10,2) DEFAULT 0,
  code_upgrade_amount NUMERIC(10,2) DEFAULT 0,
  money_collected NUMERIC(10,2) DEFAULT 0,
  collection_date TIMESTAMPTZ,
  
  -- Timing Metrics
  coc_completed_at TIMESTAMPTZ,
  coc_completion_days INTEGER,
  
  depreciation_released_at TIMESTAMPTZ,
  depreciation_release_days INTEGER,
  
  code_released_at TIMESTAMPTZ,
  code_release_days INTEGER,
  
  revised_scope_received_at TIMESTAMPTZ,
  revised_scope_days INTEGER,
  
  -- Points
  coc_bonus_points INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  
  -- API-ready fields
  external_job_id TEXT,
  external_claim_id TEXT,
  external_sync_status TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  updated_via TEXT DEFAULT 'manual',
  
  -- Notes & Audit
  notes TEXT,
  created_by UUID,
  last_modified_by UUID
);

CREATE INDEX idx_supplement_jobs_supplementer ON public.supplement_jobs(supplementer_id);
CREATE INDEX idx_supplement_jobs_status ON public.supplement_jobs(status);
CREATE INDEX idx_supplement_jobs_assigned_at ON public.supplement_jobs(assigned_at DESC);
CREATE INDEX idx_supplement_jobs_external_id ON public.supplement_jobs(external_job_id);

-- Phase 1D: Create weekly_supplementer_metrics table
CREATE TABLE public.weekly_supplementer_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  supplements_completed INTEGER DEFAULT 0,
  rcv_increased NUMERIC(12,2) DEFAULT 0,
  money_collected NUMERIC(12,2) DEFAULT 0,
  
  avg_coc_days NUMERIC(5,2) DEFAULT 0,
  avg_depreciation_days NUMERIC(5,2) DEFAULT 0,
  avg_code_days NUMERIC(5,2) DEFAULT 0,
  
  points_earned INTEGER DEFAULT 0,
  
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_weekly_supplementer_user_week ON public.weekly_supplementer_metrics(user_id, week_start DESC);

-- Phase 1E: Triggers

-- Trigger 1: Calculate timing days and COC bonus on supplement_jobs update
CREATE OR REPLACE FUNCTION public.calculate_supplement_days()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate COC days and bonus
  IF NEW.coc_completed_at IS NOT NULL AND (OLD IS NULL OR OLD.coc_completed_at IS NULL OR NEW.coc_completed_at != OLD.coc_completed_at) THEN
    NEW.coc_completion_days := EXTRACT(DAY FROM NEW.coc_completed_at - NEW.assigned_at)::INTEGER;
    
    IF NEW.coc_completion_days <= 7 THEN
      NEW.coc_bonus_points := 5;
    ELSIF NEW.coc_completion_days <= 10 THEN
      NEW.coc_bonus_points := 3;
    ELSIF NEW.coc_completion_days <= 14 THEN
      NEW.coc_bonus_points := 1;
    ELSE
      NEW.coc_bonus_points := 0;
    END IF;
  END IF;
  
  IF NEW.depreciation_released_at IS NOT NULL AND (OLD IS NULL OR OLD.depreciation_released_at IS NULL OR NEW.depreciation_released_at != OLD.depreciation_released_at) THEN
    NEW.depreciation_release_days := EXTRACT(DAY FROM NEW.depreciation_released_at - NEW.assigned_at)::INTEGER;
  END IF;
  
  IF NEW.code_released_at IS NOT NULL AND (OLD IS NULL OR OLD.code_released_at IS NULL OR NEW.code_released_at != OLD.code_released_at) THEN
    NEW.code_release_days := EXTRACT(DAY FROM NEW.code_released_at - NEW.assigned_at)::INTEGER;
  END IF;
  
  IF NEW.revised_scope_received_at IS NOT NULL AND (OLD IS NULL OR OLD.revised_scope_received_at IS NULL OR NEW.revised_scope_received_at != OLD.revised_scope_received_at) THEN
    NEW.revised_scope_days := EXTRACT(DAY FROM NEW.revised_scope_received_at - NEW.assigned_at)::INTEGER;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER calculate_supplement_timing
  BEFORE UPDATE ON public.supplement_jobs
  FOR EACH ROW EXECUTE FUNCTION public.calculate_supplement_days();

-- Trigger 2: Update supplementer metrics on job completion
CREATE OR REPLACE FUNCTION public.update_supplementer_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_total_rcv NUMERIC;
  v_total_collected NUMERIC;
  v_total_coc_bonus INTEGER;
  v_total_points INTEGER;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate new totals
    v_total_rcv := COALESCE((SELECT total_rcv_increased FROM public.supplementer_metrics WHERE user_id = NEW.supplementer_id), 0) + COALESCE(NEW.rcv_increase, 0);
    v_total_collected := COALESCE((SELECT total_money_collected FROM public.supplementer_metrics WHERE user_id = NEW.supplementer_id), 0) + COALESCE(NEW.money_collected, 0);
    v_total_coc_bonus := COALESCE((SELECT coc_bonus_points FROM public.supplementer_metrics WHERE user_id = NEW.supplementer_id), 0) + COALESCE(NEW.coc_bonus_points, 0);
    
    -- Calculate points: floor(rcv/1000) + floor(collected/2000) + coc_bonus
    v_total_points := FLOOR(v_total_rcv / 1000) + FLOOR(v_total_collected / 2000) + v_total_coc_bonus;
    
    UPDATE public.supplementer_metrics
    SET 
      total_rcv_increased = v_total_rcv,
      total_money_collected = v_total_collected,
      total_supplements_processed = total_supplements_processed + 1,
      coc_bonus_points = v_total_coc_bonus,
      points = v_total_points,
      
      avg_coc_completion_days = (
        SELECT AVG(coc_completion_days) 
        FROM public.supplement_jobs 
        WHERE supplementer_id = NEW.supplementer_id 
        AND coc_completion_days IS NOT NULL
        AND (status = 'completed' OR id = NEW.id)
      ),
      avg_depreciation_release_days = (
        SELECT AVG(depreciation_release_days) 
        FROM public.supplement_jobs 
        WHERE supplementer_id = NEW.supplementer_id 
        AND depreciation_release_days IS NOT NULL
        AND (status = 'completed' OR id = NEW.id)
      ),
      avg_code_release_days = (
        SELECT AVG(code_release_days) 
        FROM public.supplement_jobs 
        WHERE supplementer_id = NEW.supplementer_id 
        AND code_release_days IS NOT NULL
        AND (status = 'completed' OR id = NEW.id)
      ),
      avg_revised_scope_days = (
        SELECT AVG(revised_scope_days) 
        FROM public.supplement_jobs 
        WHERE supplementer_id = NEW.supplementer_id 
        AND revised_scope_days IS NOT NULL
        AND (status = 'completed' OR id = NEW.id)
      ),
      
      collection_rate = CASE 
        WHEN v_total_rcv > 0 
        THEN ROUND((v_total_collected / v_total_rcv) * 100, 2)
        ELSE 0
      END,
      
      updated_at = NOW()
    WHERE user_id = NEW.supplementer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_metrics_on_completion
  AFTER UPDATE ON public.supplement_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_supplementer_metrics();

-- Trigger 3: Auto-create supplementer_metrics on role insert
CREATE OR REPLACE FUNCTION public.create_supplementer_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'supplementer' THEN
    INSERT INTO public.supplementer_metrics (user_id, display_name)
    SELECT NEW.user_id, p.full_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_supplementer_metrics_on_role
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.create_supplementer_metrics();

-- Phase 1F: RLS Policies

-- supplementer_metrics RLS
ALTER TABLE public.supplementer_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all supplementer metrics"
  ON public.supplementer_metrics FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supplementers can view own metrics"
  ON public.supplementer_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can view supplementer metrics for leaderboard"
  ON public.supplementer_metrics FOR SELECT
  USING (true);

CREATE POLICY "Supplementers can update own display_name"
  ON public.supplementer_metrics FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- supplement_jobs RLS
ALTER TABLE public.supplement_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all supplement jobs"
  ON public.supplement_jobs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supplementers can view own jobs"
  ON public.supplement_jobs FOR SELECT
  USING (supplementer_id = auth.uid());

CREATE POLICY "Supplementers can insert own jobs"
  ON public.supplement_jobs FOR INSERT
  WITH CHECK (supplementer_id = auth.uid());

CREATE POLICY "Supplementers can update own jobs"
  ON public.supplement_jobs FOR UPDATE
  USING (supplementer_id = auth.uid());

-- weekly_supplementer_metrics RLS
ALTER TABLE public.weekly_supplementer_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all weekly supplementer metrics"
  ON public.weekly_supplementer_metrics FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view weekly supplementer metrics"
  ON public.weekly_supplementer_metrics FOR SELECT
  USING (true);

-- Phase 1G: Add supplementer_rcv_goal to company_goals
ALTER TABLE public.company_goals
  ADD COLUMN IF NOT EXISTS supplementer_rcv_goal NUMERIC(12,2) DEFAULT 500000;

-- Enable realtime for supplementer tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplementer_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_supplementer_metrics;
