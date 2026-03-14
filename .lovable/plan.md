

# Add Damage Tracking to Lead Outcomes + EOD Report Metrics

## Overview

Three connected changes: (1) Won leads auto-mark canvasser damage as "damaged", (2) Lost leads get a structured dialog with damage Y/N + reason buttons, (3) EOD report adds NI/Dmg/No Dmg columns. Both "damaged" AND "not damaged" are tracked and counted.

## Database Migration

Add `was_damaged` boolean to `quote_requests`:
```sql
ALTER TABLE public.quote_requests ADD COLUMN was_damaged BOOLEAN DEFAULT NULL;
```

## Changes

### 1. EOD Report — `supabase/functions/send-canvasser-eod-report/index.ts`

- Aggregate `not_interested_delta`, `leads_with_damage_delta`, `leads_without_damage_delta` from daily entries
- Add 3 new fields to `canvasserData`: `notInterested`, `damaged`, `notDamaged`
- Add 3 new table columns: **NI**, **Dmg**, **No Dmg**
- Add to Team Totals summary

### 2. Won Flow — Both `LeadDetailView.tsx` and `LeadDetail.tsx`

When "Won" is clicked:
- Set `was_damaged: true` on the lead (won = damage confirmed)
- If lead has `canvasser_id`, auto-increment:
  - `canvasser_metrics.leads_with_damage` (+1 YTD)
  - Upsert `daily_canvasser_metric_entries` for today with +1 `leads_with_damage_delta`
  - Upsert `weekly_canvasser_metrics` for current week with +1 `leads_with_damage`

### 3. Lost Flow — Both `LeadDetailView.tsx` and `LeadDetail.tsx`

Replace the current dropdown + Lost button with a **Dialog** triggered by clicking "Lost":

- **Step 1**: "Was there damage?" — **Yes** / **No** buttons
- **Step 2**: "Why was it lost?" — Button grid: "One Leg", "Too Expensive", "Customer Not Home", "Renter", "Not Interested", "Other"
- On confirm: save `status: "lost"`, `lost_at`, `lost_reason`, `was_damaged` to the lead
- If lead has `canvasser_id`:
  - **If damaged (Yes)**: increment `leads_with_damage_delta` / `leads_with_damage` across all 3 metric tiers
  - **If not damaged (No)**: increment `leads_without_damage_delta` / `leads_without_damage` across all 3 metric tiers
- Remove the old lost reason Select dropdown

Updated `lostReasons`: `["One Leg", "Too Expensive", "Customer Not Home", "Renter", "Not Interested", "Other"]`

### 4. Lost Deal Email — `supabase/functions/notify-deal-lost/index.ts`

- Accept `wasDamaged` (boolean) in the request body
- Add "Damage Found: Yes / No" line to the email HTML so admins can assess save opportunity
- Update both files' `fireStatusNotification` to pass `wasDamaged` in the body

### 5. Canvasser Metric Update Helper

Create a shared async function (inline in both files) that handles the 3-tier metric upsert:
- Takes `canvasserId`, `isDamaged` (boolean)
- Increments the correct damage field on `canvasser_metrics`, `daily_canvasser_metric_entries`, and `weekly_canvasser_metrics`

## Files to Change

| File | Change |
|------|--------|
| DB migration | Add `was_damaged` to `quote_requests` |
| `send-canvasser-eod-report/index.ts` | Add NI, Dmg, No Dmg columns + totals |
| `LeadDetailView.tsx` | Lost dialog, Won auto-damage, metric updates |
| `LeadDetail.tsx` | Same lost dialog + won logic |
| `notify-deal-lost/index.ts` | Add damage status to email |

