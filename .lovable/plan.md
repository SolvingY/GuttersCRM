

# Fix: Canvasser Metrics Not Updating in Real-Time

## Root Cause
The `canvasser_metrics` table is **not added to the Supabase realtime publication**. The realtime subscriptions we added in AdminOverview and CanvasserStats are listening, but the database never broadcasts changes because the table isn't published.

Only `supplementer_metrics` and `weekly_supplementer_metrics` are currently in the realtime publication.

## Fix
Run a single database migration to add the `canvasser_metrics` table to the realtime publication:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvasser_metrics;
```

That's it. No code changes needed — the subscriptions are already correctly wired in both `AdminOverview.tsx` and `CanvasserStats.tsx`.

## What This Fixes
1. **Canvasser dashboard Key Metrics / Funnel / Conversion Funnel** — will auto-refresh when admin saves Weekly Updates (which writes to `canvasser_metrics`)
2. **Admin Overview "Detailed Stats"** — will auto-refresh when `canvasser_metrics` rows change

## Optional: Also add `user_metrics` to realtime
The AdminOverview subscription also listens on `user_metrics` for sales rep changes. If that table is also missing from the publication, sales rep detailed stats would have the same stale-data issue. The migration would be:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_metrics;
```

