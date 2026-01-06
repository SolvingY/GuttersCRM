-- =============================================
-- PART 1: Add new columns to Sales Rep tables
-- =============================================

-- Add to user_metrics (yearly totals for sales reps)
ALTER TABLE public.user_metrics 
ADD COLUMN IF NOT EXISTS collections numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS canvass_leads integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS canvass_deals_closed integer DEFAULT 0;

-- Add to weekly_user_metrics (weekly tracking for sales reps)
ALTER TABLE public.weekly_user_metrics 
ADD COLUMN IF NOT EXISTS collections numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS approved_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS canvass_leads integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS canvass_deals_closed integer DEFAULT 0;

-- =============================================
-- PART 2: Add new columns to Canvasser tables
-- =============================================

-- Add to canvasser_metrics (yearly totals for canvassers)
ALTER TABLE public.canvasser_metrics 
ADD COLUMN IF NOT EXISTS doors_knocked integer DEFAULT 0;

-- Add to weekly_canvasser_metrics (weekly tracking for canvassers)
ALTER TABLE public.weekly_canvasser_metrics 
ADD COLUMN IF NOT EXISTS doors_knocked integer DEFAULT 0;

-- =============================================
-- PART 3: Create The Pit wagering system tables
-- =============================================

-- Wager Events (contests/competitions to bet on)
CREATE TABLE public.pit_wager_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'open',
  contest_id uuid REFERENCES public.contests(id) ON DELETE SET NULL,
  wagers_close_at timestamptz NOT NULL,
  resolves_at timestamptz,
  resolved_at timestamptz,
  created_by uuid,
  min_wager integer DEFAULT 10,
  max_wager integer DEFAULT 500,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Betting Options (people/outcomes to bet on)
CREATE TABLE public.pit_wager_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.pit_wager_events(id) ON DELETE CASCADE,
  user_id uuid,
  option_label text NOT NULL,
  payout_multiplier numeric DEFAULT 2.0,
  is_winner boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Individual Wagers
CREATE TABLE public.pit_wagers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.pit_wager_events(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.pit_wager_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  points_wagered integer NOT NULL,
  potential_payout integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  points_won integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Point Transactions Audit Trail
CREATE TABLE public.pit_point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wager_id uuid REFERENCES public.pit_wagers(id) ON DELETE SET NULL,
  transaction_type text NOT NULL,
  points_change integer NOT NULL,
  balance_after integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- PART 4: Enable RLS on The Pit tables
-- =============================================

ALTER TABLE public.pit_wager_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pit_wager_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pit_wagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pit_point_transactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PART 5: RLS Policies for pit_wager_events
-- =============================================

-- All authenticated users can view events
CREATE POLICY "Authenticated users can view wager events"
ON public.pit_wager_events FOR SELECT
USING (true);

-- Admins can manage events
CREATE POLICY "Admins can insert wager events"
ON public.pit_wager_events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update wager events"
ON public.pit_wager_events FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete wager events"
ON public.pit_wager_events FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PART 6: RLS Policies for pit_wager_options
-- =============================================

-- All authenticated users can view options
CREATE POLICY "Authenticated users can view wager options"
ON public.pit_wager_options FOR SELECT
USING (true);

-- Admins can manage options
CREATE POLICY "Admins can insert wager options"
ON public.pit_wager_options FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update wager options"
ON public.pit_wager_options FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete wager options"
ON public.pit_wager_options FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PART 7: RLS Policies for pit_wagers
-- =============================================

-- Users can view their own wagers
CREATE POLICY "Users can view their own wagers"
ON public.pit_wagers FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all wagers
CREATE POLICY "Admins can view all wagers"
ON public.pit_wagers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can place their own wagers
CREATE POLICY "Users can place their own wagers"
ON public.pit_wagers FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can update wagers (for resolving)
CREATE POLICY "Admins can update wagers"
ON public.pit_wagers FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PART 8: RLS Policies for pit_point_transactions
-- =============================================

-- Users can view their own transactions
CREATE POLICY "Users can view their own point transactions"
ON public.pit_point_transactions FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all transactions
CREATE POLICY "Admins can view all point transactions"
ON public.pit_point_transactions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert transactions (system-generated)
CREATE POLICY "Admins can insert point transactions"
ON public.pit_point_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own transactions (for placing wagers)
CREATE POLICY "Users can insert their own point transactions"
ON public.pit_point_transactions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- =============================================
-- PART 9: Create updated_at trigger for pit_wager_events
-- =============================================

CREATE TRIGGER update_pit_wager_events_updated_at
BEFORE UPDATE ON public.pit_wager_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();