CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('crm-cadence-hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crm-cadence-hourly');

SELECT cron.schedule(
  'crm-cadence-hourly',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--b00a8021-9d8d-4f49-a581-628727b71f68.lovable.app/api/public/crm/run',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlueHVvdGJqZnhrY3JmdmtybHRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODI2NjYsImV4cCI6MjA5Mzk1ODY2Nn0.NmGjLNtxcYfnmhpd6T7VwH5sO2R0K8D-4sv7ATvZezc"}'::jsonb,
    body := '{"max_sends": 100}'::jsonb
  ) AS request_id;
  $$
);