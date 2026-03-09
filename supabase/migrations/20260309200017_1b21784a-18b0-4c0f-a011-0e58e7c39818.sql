-- daily_canvasser_metric_entries: allow canvassers to insert/update own rows
CREATE POLICY "Canvassers insert own daily entries"
  ON daily_canvasser_metric_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Canvassers update own daily entries"
  ON daily_canvasser_metric_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- weekly_canvasser_metrics: allow canvassers to insert/update own rows
CREATE POLICY "Canvassers insert own weekly metrics"
  ON weekly_canvasser_metrics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Canvassers update own weekly metrics"
  ON weekly_canvasser_metrics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

-- canvasser_metrics: drop narrow policy, add full update
DROP POLICY IF EXISTS "Canvassers can update their own display_name" ON canvasser_metrics;

CREATE POLICY "Canvassers update own metrics"
  ON canvasser_metrics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);