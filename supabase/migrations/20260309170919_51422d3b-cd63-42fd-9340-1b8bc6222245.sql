
-- production_metrics RLS
ALTER TABLE public.production_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own production metrics" ON public.production_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage production metrics" ON public.production_metrics FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated view all production metrics" ON public.production_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Production users can update own metrics" ON public.production_metrics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- weekly_production_metrics RLS
ALTER TABLE public.weekly_production_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage weekly production metrics" ON public.weekly_production_metrics FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated view weekly production metrics" ON public.weekly_production_metrics FOR SELECT TO authenticated USING (true);

-- daily_production_metric_entries RLS
ALTER TABLE public.daily_production_metric_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage daily production entries" ON public.daily_production_metric_entries FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users view own daily production entries" ON public.daily_production_metric_entries FOR SELECT USING (auth.uid() = user_id);

-- production_shifts RLS
ALTER TABLE public.production_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own production shifts" ON public.production_shifts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all production shifts" ON public.production_shifts FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- production_checklists RLS
ALTER TABLE public.production_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view active checklists" ON public.production_checklists FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage checklists" ON public.production_checklists FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- production_checklist_submissions RLS
ALTER TABLE public.production_checklist_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checklist submissions" ON public.production_checklist_submissions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins view all checklist submissions" ON public.production_checklist_submissions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- production_daily_logs RLS
ALTER TABLE public.production_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily logs" ON public.production_daily_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all daily logs" ON public.production_daily_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default checklist templates
INSERT INTO public.production_checklists (title, description, checklist_type, checklist_items) VALUES
('Pre-Build Checklist', 'Complete before starting any roofing build', 'pre_build', '[
  {"id":"1","label":"Materials delivered and verified","required":true},
  {"id":"2","label":"Safety equipment inspected","required":true},
  {"id":"3","label":"Crew briefed on scope of work","required":true},
  {"id":"4","label":"Customer contact confirmed","required":true},
  {"id":"5","label":"Dumpster/waste removal staged","required":false}
]'::jsonb),
('Post-Build Checklist', 'Complete after build before leaving job site', 'post_build', '[
  {"id":"1","label":"All debris removed from property","required":true},
  {"id":"2","label":"Gutters cleaned of construction debris","required":true},
  {"id":"3","label":"Nails swept from driveway and lawn","required":true},
  {"id":"4","label":"Customer walkthrough completed","required":true},
  {"id":"5","label":"Before/after photos taken","required":true},
  {"id":"6","label":"Permit card signed if applicable","required":false}
]'::jsonb),
('Water Test Checklist', 'Verify water intrusion has been resolved', 'water_test', '[
  {"id":"1","label":"All penetrations sealed and inspected","required":true},
  {"id":"2","label":"Valley and hip transitions verified","required":true},
  {"id":"3","label":"Flashing properly seated and sealed","required":true},
  {"id":"4","label":"Water test performed (hose test minimum 10 min)","required":true},
  {"id":"5","label":"No leaks confirmed inside structure","required":true}
]'::jsonb),
('Repair Checklist', 'Document and verify repair scope', 'repair', '[
  {"id":"1","label":"Repair area photographed before","required":true},
  {"id":"2","label":"Damaged materials removed and documented","required":true},
  {"id":"3","label":"Repair completed to manufacturer spec","required":true},
  {"id":"4","label":"Repair area photographed after","required":true},
  {"id":"5","label":"Customer notified of completion","required":true}
]'::jsonb);
