
-- Production metrics (YTD per user)
CREATE TABLE public.production_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text,
  builds_completed integer NOT NULL DEFAULT 0,
  build_issues integer NOT NULL DEFAULT 0,
  checklists_completed integer NOT NULL DEFAULT 0,
  build_efficiency numeric(5,2) NOT NULL DEFAULT 0,
  points numeric NOT NULL DEFAULT 0,
  contest_points integer DEFAULT 0,
  wager_points integer DEFAULT 0,
  yearly_goal integer NOT NULL DEFAULT 0,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Weekly production metrics (leaderboard snapshots)
CREATE TABLE public.weekly_production_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  builds_completed integer NOT NULL DEFAULT 0,
  build_issues integer NOT NULL DEFAULT 0,
  checklists_completed integer NOT NULL DEFAULT 0,
  build_efficiency numeric(5,2) NOT NULL DEFAULT 0,
  points_earned numeric NOT NULL DEFAULT 0,
  week_start date NOT NULL,
  week_end date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Daily admin delta entries
CREATE TABLE public.daily_production_metric_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  builds_completed_delta integer NOT NULL DEFAULT 0,
  build_issues_delta integer NOT NULL DEFAULT 0,
  checklists_completed_delta integer NOT NULL DEFAULT 0,
  notes text,
  entered_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, entry_date)
);

-- Production shifts (time clock)
CREATE TABLE public.production_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in_at timestamptz NOT NULL DEFAULT now(),
  clock_out_at timestamptz,
  clock_in_lat numeric(10,7),
  clock_in_lng numeric(10,7),
  clock_out_lat numeric(10,7),
  clock_out_lng numeric(10,7),
  hours_worked numeric(6,2),
  status text NOT NULL DEFAULT 'active',
  notes text,
  flagged_reason text,
  edited_at timestamptz,
  edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Checklist templates (admin-managed)
CREATE TABLE public.production_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  checklist_type text NOT NULL,
  checklist_items jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Checklist submissions by production users
CREATE TABLE public.production_checklist_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.production_checklists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  responses jsonb NOT NULL DEFAULT '{}',
  job_address text,
  notes text,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Daily activity log (drives EOD email to GM)
CREATE TABLE public.production_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  builds_completed integer NOT NULL DEFAULT 0,
  checklists_submitted integer NOT NULL DEFAULT 0,
  hours_worked numeric(6,2),
  summary_notes text,
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_production_metrics_updated_at BEFORE UPDATE ON public.production_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_production_shifts_updated_at BEFORE UPDATE ON public.production_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_production_checklists_updated_at BEFORE UPDATE ON public.production_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_production_daily_logs_updated_at BEFORE UPDATE ON public.production_daily_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
