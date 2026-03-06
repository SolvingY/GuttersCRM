-- Schedule the weekly performance report to send every Sunday at 6 PM CST (23:00 UTC)
-- This uses pg_cron + pg_net to invoke the send-scheduled-report edge function.
-- Prerequisites:
--   1. pg_cron extension enabled in Supabase dashboard (Database → Extensions)
--   2. pg_net extension enabled in Supabase dashboard
--   3. CRON_SECRET set in edge function secrets (Supabase dashboard → Edge Functions → Secrets)
--      Generate with: openssl rand -hex 32

-- Enable required extensions (idempotent — safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing job with this name to allow re-running this migration safely
SELECT cron.unschedule('send-sunday-performance-report')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-sunday-performance-report'
);

-- Schedule: every Sunday at 23:00 UTC = 6 PM CST (UTC-5) / 5 PM CDT (UTC-6)
-- Cron expression:  minute hour day-of-month month day-of-week
--                   0      23   *             *     0   (0 = Sunday)
SELECT cron.schedule(
  'send-sunday-performance-report',
  '0 23 * * 0',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/send-scheduled-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    ),
    body    := '{"frequency":"weekly"}'::jsonb
  );
  $$
);

-- Confirm the job was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-sunday-performance-report') THEN
    RAISE NOTICE 'pg_cron job "send-sunday-performance-report" scheduled successfully (Sun 23:00 UTC = 6 PM CST).';
  ELSE
    RAISE WARNING 'pg_cron job scheduling may have failed. Check that pg_cron and pg_net are enabled.';
  END IF;
END;
$$;
