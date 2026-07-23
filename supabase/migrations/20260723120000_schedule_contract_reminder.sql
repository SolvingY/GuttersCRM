-- Schedule the 48-hour unsigned-contract reminder to run once daily.
-- The send-contract-reminder edge function already existed but was never wired
-- to any schedule, so the automatic reminder never fired — reps had to resend
-- manually. This uses pg_cron + pg_net to invoke it once a day.
--
-- Runs daily (not hourly) so an unsigned contract gets at most one reminder per
-- day. The function itself only targets contracts sent > 48h ago whose signing
-- token has not expired, which bounds the total number of reminders per lead.
--
-- Prerequisites (same as the weekly report):
--   1. pg_cron extension enabled (Database → Extensions)
--   2. pg_net extension enabled
--   3. CRON_SECRET set in edge function secrets (harmless here — the function
--      is verify_jwt=false and does not check it — but kept for consistency)
--   4. app.settings.supabase_url / app.settings.cron_secret configured (as the
--      existing weekly-report job already relies on)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing job with this name so this migration is safe to re-run
SELECT cron.unschedule('send-contract-reminder-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-contract-reminder-daily'
);

-- Schedule: every day at 15:00 UTC (~9-10 AM CST/CDT)
--   minute hour day-of-month month day-of-week
--   0      15   *            *     *
SELECT cron.schedule(
  'send-contract-reminder-daily',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/send-contract-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-contract-reminder-daily') THEN
    RAISE NOTICE 'pg_cron job "send-contract-reminder-daily" scheduled successfully (daily 15:00 UTC).';
  ELSE
    RAISE WARNING 'pg_cron job scheduling may have failed. Check that pg_cron and pg_net are enabled.';
  END IF;
END;
$$;
