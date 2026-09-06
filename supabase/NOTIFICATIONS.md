# Notification deployment

The mobile app owns permission prompts and the daily Study Reminder schedule. The `process-notifications` Edge Function owns server-only delivery for Streak Alerts, New Questions Added, and Weekly Progress Reports so those categories remain correct while the app is closed.

Deploy the function with:

```sh
supabase functions deploy process-notifications
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=...
```

Run `POST /functions/v1/process-notifications` from a trusted cron every 15 minutes (and on Sunday at the desired report time). Configure a Supabase Database Webhook or the same cron to invoke it after inserts to `questions`; the SQL trigger records an idempotent minute-level question batch. Never put `SUPABASE_SERVICE_ROLE_KEY` in the app or `app.json`.
