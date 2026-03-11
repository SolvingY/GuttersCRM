ALTER TABLE public.admin_dashboard_preferences
  ADD COLUMN IF NOT EXISTS pinned_shortcuts jsonb NOT NULL DEFAULT '[]';