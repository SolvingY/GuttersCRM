

# Profitability Panel: Reorder, Top Summary, Email Feature

## Changes

### 1. `src/pages/admin/LeadDetail.tsx` — Reorder sections + add profit summary at top

**Reorder** the collapsible sections to this order:
1. Saved Estimates
2. Scheduling / Payments
3. Quote Approval
4. Files
5. Timeline
6. Activity Log
7. **Job Profitability** (moved down, just above Admin Notes)
8. Admin Notes
9. Archive Lead (moved to very bottom)
10. Permanently Delete (moved to very bottom)
11. Archived info block

**Add a compact profit summary card at the very top** of the right column (above all collapsible sections), visible only to admins when estimates exist and a profitability record has been saved. This will query `job_profitability` by estimate ID and display:
- Gross Profit (green/red) and Margin % in a small highlighted card
- This is read-only, non-collapsible, always visible — a quick glance widget

### 2. `src/components/admin/JobProfitabilityPanel.tsx` — Add "Email Report" feature

Below the "Save Profitability" button, add a "Send Profitability Report" button that opens a dialog:
- Text input to type an email address + "Add" button
- List of added emails as removable chips
- "Send" button that invokes `send-profitability-summary` with `recipient_emails` array
- The dialog reuses the same payload structure as the auto-save email

### 3. `supabase/functions/send-profitability-summary/index.ts` — Support custom recipients

Accept optional `recipient_emails: string[]` in the request body. If provided and non-empty, send to those addresses instead of querying admin emails. All other logic (auth check, HTML template) stays the same.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/LeadDetail.tsx` | Reorder sections, add top profit summary |
| `src/components/admin/JobProfitabilityPanel.tsx` | Add email dialog with custom recipients |
| `supabase/functions/send-profitability-summary/index.ts` | Support `recipient_emails` override |

