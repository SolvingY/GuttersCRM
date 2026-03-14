

# Profitability Report — Configurable Auto-Send Recipients

## Problem
When saving profitability data, line 156 of `JobProfitabilityPanel.tsx` calls `send-profitability-summary` without a `recipient_emails` list, so the edge function falls back to emailing **all active admins** (6 people). You only want 3 specific people to receive it.

## Changes

### 1. `src/pages/admin/ReportSettings.tsx` — Add "Profitability Report Recipients" section

Add a new Card section (similar to existing report recipient management) with:
- A list of email addresses with toggle switches (on/off)
- An input to add new email addresses
- Pre-populated with the 3 target emails: `r.baker@oknextgen.com`, `k.jameson@oknextgen.com`, `adam@grateful-services.com`
- Stored in `report_settings` table under a key like `profitability_report_recipients` (JSON array of emails)
- Save button persists the list

### 2. `src/components/admin/JobProfitabilityPanel.tsx` — Use configured recipients for auto-send

Update the auto-send on save (line 154-156) to:
- Fetch the `profitability_report_recipients` setting from `report_settings` before sending
- Pass those emails as `recipient_emails` in the edge function call
- If no recipients configured, skip the auto-send entirely (don't fall back to all admins)

### 3. Edge function — No changes needed

The `send-profitability-summary` function already supports `recipient_emails` array. When provided, it sends only to those addresses.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/ReportSettings.tsx` | Add Profitability Report Recipients config card |
| `src/components/admin/JobProfitabilityPanel.tsx` | Fetch configured recipients before auto-send |

