# Lead Lifecycle Audit Playbook

A repeatable procedure for auditing the full lead life — from creation through
profit and warranty — across the three personas that touch it. Use this whenever
you change the pipeline, add a trigger, or want to re-verify the system end to end.

The first run of this playbook (2026-07) produced the fixes logged at the bottom.

---

## How the system is wired (orientation)

- **Stack:** Vite + React + TypeScript SPA (Lovable), Supabase Postgres, Deno edge
  functions. Email is **Resend only** — no SMS. PDFs are client-side `jspdf`.
- **The lead is the `quote_requests` table.** `status` is free text (no enum):
  `new → contacted → quoted → won → scheduled → completed`, side-exits
  `lost / cancelled / archived`. Milestones are timestamp columns
  (`won_at`, `install_scheduled_at`, `completed_at`, …).
- **Related tables:** `gutter_estimates`, `lead_forms` (contract/appointment/
  warranty/inspection), `lead_payments`, `lead_activity_log`, `job_profitability`.
- **Triggers are React-side `supabase.functions.invoke(...)` calls**, not DB
  triggers — so a bulk/direct status update skips the email. DB triggers exist for
  metrics/activity logging (`log_lead_status_change`, `update_lead_close_stats`).

---

## The three-persona walk

Audit by tracing each persona through the code and asking, at every milestone,
"what fires, does it fire reliably, and does the customer/rep/crew actually get it?"

### 1. Sales rep
Create lead (`GetQuote`, `CreateLeadDialog`, `CreateCanvasserLead`) → auto/manual
assignment (`auto_assign_lead`, `admin/Leads` queue, `admin/LeadDetail` dropdown) →
estimate (`NGRGutterCalculator`) → submit/approve quote (`QuoteApprovalSection`) →
won → schedule install (`LeadSchedulingPayments`) → collect payments → close job →
profit (`JobProfitabilityPanel`).

### 2. Client
Web signup (`GetQuote` → `submit_quote_request`) → request-received email →
quote/estimate email → contract sent for signature (`GutterContract` /
`SignContract`) → signed confirmation copy → install confirmation → payment
receipt → warranty documents.

### 3. Contractor / installer
(Currently the least-developed journey.) `production` role → install scheduling →
install milestones → completion → warranty issuance → payout/cost in
`job_profitability`. **Known gap:** installs are not a first-class entity; there is
no installer assignment or installer-facing notification. See "Open follow-ups."

---

## The trigger map (keep this current)

| Milestone | Fires from | Edge function | Recipient |
|---|---|---|---|
| Lead submitted (web) | `GetQuote` | `send-quote-email` (type:"received") + `notify-new-lead` | client + team |
| Lead submitted (canvasser) | `CreateCanvasserLead` | `notify-new-lead` + `send-inspection-email` | team + client |
| Lead assigned | `admin/LeadDetail` dropdown, `admin/Leads` queue | `notify-lead-assigned` | rep |
| Quote pending | `QuoteApprovalSection` | `notify-quote-pending` | admin |
| Quote approved (auto-won) | `QuoteApprovalSection` | `send-quote-approval-email` + `notify-deal-won` | client + team |
| Deal won/lost (manual) | `LeadDetail(View)` | `notify-deal-won` / `notify-deal-lost` | team |
| Contract sent | `GutterContract` | `send-contract-signing-email` | client |
| Contract signed | `SignContract` / `GutterContract` | `notify-contract-signed` + `send-signed-contract-confirmation` | rep + client |
| Contract unsigned 48h | pg_cron (daily) | `send-contract-reminder` | client |
| Install scheduled | `LeadSchedulingPayments` | `send-install-confirmation` | client |
| Payment logged | `LeadSchedulingPayments` | `send-payment-receipt` | client |
| Job closed | `LeadSchedulingPayments` | `send-warranty-email` | client |

---

## Standing checks (what "healthy" means)

Run these greps/reviews every audit. Any violation is a finding.

1. **Every Resend send checks `res.ok`.** A function that reads `res.json()` and
   returns `success:true` without checking the status silently swallows failures.
   ```
   for f in supabase/functions/*/index.ts; do
     grep -q "api.resend.com" "$f" && ! grep -q "\.ok" "$f" && echo "NO-CHECK: $f"
   done
   ```
2. **Every caller checks the returned `{ error }`.** `await invoke(...)` without
   destructuring `{ error }` before toasting "sent" / logging a "sent" activity row
   is a false-success bug.
3. **No status transition without its notification.** If a status is set from more
   than one place (dropdown, dedicated button, edge function, bulk update), each
   path must fire the same trigger. Watch for direct `.update({ status })` that
   bypasses the handler that sends the email.
4. **Contract terms match across surfaces.** Warranty length, rebate %, and pricing
   shown in the signed contract, the warranty email, and any PDF must derive from
   one source (`src/lib/warrantyTerms.ts`), never re-matched strings per surface.
5. **No user input interpolated unescaped into email HTML.** Fields like
   `installNotes`, `address`, `preExisting`, names flow into template literals —
   escape them (open HTML-injection surface). *(Open follow-up — Phase 4.)*
6. **Money reconciles.** Profit should reflect collected `lead_payments`, not only
   the estimate's `quoted_price`. `quote_requests.quote_amount` should match the
   latest estimate's `quoted_price`.
7. **No orphaned/fake handlers.** A submit handler that `setTimeout`s and toasts
   success without persisting is a silent data-drop hazard.

---

## Regression pass

Run after any lifecycle change (all must be green):

```
npx tsc --noEmit -p tsconfig.app.json   # typecheck
npm run test                            # vitest unit tests (helpers)
npm run build                           # vite production build
npm run lint                            # eslint (repo has known no-explicit-any debt)
```

Then a **manual lifecycle smoke** in a test/staging project:
create lead → request-received email → estimate/quote → approve (deal-won fires) →
send contract → sign remotely (client copy fires) → schedule install (confirmation) →
log payment (receipt fires) → close job (warranty fires) → confirm the profit panel
shows collected revenue. For each email, confirm it actually left Resend (dashboard)
and the `lead_activity_log` matches what the UI claimed.

Edge functions: `supabase functions deploy <name>` the changed ones and invoke each
once with a known-bad payload to confirm it now returns non-2xx on failure.

---

## Findings log

### 2026-07 audit (first run)

Phase 1 — broken/missing triggers (all fixed):
1. ~14 edge functions never checked `res.ok` → silent send failures. **Fixed.**
2. Frontend callers ignored `{ error }`, toasted false success. **Fixed.**
3. `notify-deal-won` never fired on the quote-approval auto-won path. **Fixed.**
4. Remote contract signers got no confirmation copy despite the promise. **Fixed.**
5. Canvasser-queue assignment sent no `notify-lead-assigned`. **Fixed.**
6. Warranty terms disagreed between contract and email. **Fixed** (`warrantyTerms.ts`).
7. Web leads got a misleading quote template at intake. **Fixed** (request-received).
8. No payment receipt email existed. **Fixed** (`send-payment-receipt`).
9. `send-contract-reminder` was wired to no schedule. **Fixed** (daily pg_cron).
10. Fake orphaned `LeadForm.tsx` (silent lead drop). **Fixed** (removed).

Phase 2 — data integrity:
12. Profit ignored collected revenue. **Fixed** (collected-revenue reconciliation).
13. Estimator didn't sync `quote_amount` to the lead. **Fixed.**
14. Status dropdown didn't stamp terminal timestamps / reset `won_at`. **Fixed.**

### Open follow-ups (recommended, not yet done)

- **Step 11 — reconcile `update_lead_close_stats()`** migrations (0223 vs 0224
  credit revenue on different transitions). Subtle metrics change; do as a reviewed
  standalone migration.
- **Step 15 — `auto_assign_lead()` race.** No locking; concurrent inserts can exceed
  `max_leads_per_rep`. Needs an advisory lock.
- **Phase 3 — Contractor/installer journey.** Make installs a first-class entity:
  `installer_id`/crew assignment, an `in_progress` milestone, installer
  notifications, and a persisted warranty record (`warranties` table).
- **Phase 4 — Security hardening.** Escape user input in email HTML; review the
  `verify_jwt=false` + CORS `*` posture and the public `WITH CHECK (true)` INSERT on
  `quote_requests`; replace hardcoded fallback recipients in `notify-new-lead`.
