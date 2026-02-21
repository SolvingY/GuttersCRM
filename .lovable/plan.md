

# Implementation Plan: Scheduling, Payments, Job Closeout, Warranty Email, and Canvasser Leads

## Execution Order

### Step 1: Database Migration

Single migration adding all schema changes:

```text
-- quote_requests: scheduling, closeout, canvasser columns
install_date (date), install_time_window (text), install_notes (text),
install_scheduled_at (timestamptz), completed_at (timestamptz), canvasser_id (uuid)

-- lead_payments table
id, lead_id (FK), amount, payment_method, payment_date, reference_number, logged_by, created_at

-- RLS policies on lead_payments:
1. "Reps can manage own lead payments" - FOR ALL USING (auth.uid() = logged_by)
2. "Admins can manage all payments" - FOR ALL USING (has_role(auth.uid(), 'admin'))
3. "Reps can view payments on own leads" - FOR SELECT USING (EXISTS (SELECT 1 FROM quote_requests WHERE id = lead_payments.lead_id AND assigned_to = auth.uid()))
```

The third SELECT policy ensures reps see all payments on their leads even when an admin logged the payment.

---

### Step 2: Edge Functions (2 new)

**`supabase/functions/send-install-confirmation/index.ts`**
- Accepts: clientName, clientEmail, installDate, timeWindow, address, installNotes, referenceNumber
- Sends HTML email from `notifications@oknextgen.com` via Resend
- Subject: "Your Next Generation Guttering Installation is Scheduled"
- Includes date, time window, address, notes, homeowner prep reminder
- Pattern follows existing `send-quote-email` structure

**`supabase/functions/send-warranty-email/index.ts`**
- Accepts: clientName, clientEmail, quoteAmount, referenceNumber, installDate, completedAt, protectionProduct
- Calculates rebate server-side: `(quoteAmount * 0.10).toFixed(2)`
- Warranty tiers based on protectionProduct:
  - Hydro Flow / Pro Flo: 45-Year Manufacturer Warranty
  - Gutter RX: 10-Year Manufacturer Warranty
  - Cheap Mesh / null: omitted
- Always includes: Lifetime Leak-Free Guarantee, 25-Year Paint Warranty

---

### Step 3: LeadDetailView.tsx (Rep View)

**Status options update**: Add "completed" to statusOptions array.

**Scheduling Section** (right column, after Quote section):
- Only visible when `["won", "scheduled", "approved", "completed"].includes(lead.status)`
- State: installDate, installTimeWindow (default "morning"), installNotes
- Pre-populated from lead data if already scheduled
- Button label: "Save & Send Confirmation" or "Update Schedule & Resend Confirmation" if install_date already exists
- On save: updates quote_requests, sets status to "scheduled", calls send-install-confirmation, logs "Installation scheduled for [date] ([time window])"
- When status is "completed": shows green badge "Job Complete -- Warranty Sent" with completed_at date

**Payments Section** (right column, below scheduling):
- Fetches lead_payments where lead_id = id
- Add payment form with validation: amount > 0, payment_date defaults to today
- Methods: Cash, Check, Card, Financing, Zelle, Venmo
- Balance summary: Quote Total (using `lead.quote_amount ?? 0`), Total Paid, Balance Due
- Logs activity: "Payment received: $[amount] via [method]"

**Close Job Button**:
- Guard: `totalPaid >= quoteAmount && quoteAmount > 0 && lead.status !== "completed"`
- On click: fetches latest gutter_estimates for protection_product, updates status to "completed" + completed_at, calls send-warranty-email with protectionProduct and quoteAmount, logs "Job closed -- warranty documents sent to customer"

**Canvasser Badge**:
- When canvasser_id is present, fetch canvasser profile name
- Show amber/orange badge: "Canvasser Lead -- [Name]" replacing the blue Internet Lead badge

---

### Step 4: LeadDetail.tsx (Admin View)

- Add "completed" to statusOptions
- Add Scheduling section (same as rep view)
- Add Payments section (same as rep view, admin can log payments and close jobs)
- Add Close Job button with same logic
- Canvasser badge with amber/orange styling
- Timeline: add completed_at and install_scheduled_at entries

---

### Step 5: CreateLeadDialog.tsx

- Add `{ value: "canvasser", label: "Canvasser" }` to leadSourceOptions
- Add canvasser_id to form state
- When lead_source === "canvasser", show canvasser dropdown
- Fetch canvassers via user_roles where role='canvasser' joined with profiles
- Empty state: disabled select "No canvassers found -- add canvassers in user management"
- After RPC create, if canvasser_id set, update lead with separate .update() call
- Also set lead_type to "canvasser" when source is "canvasser"

---

### Step 6: CanvasserStats.tsx

- Add "My Canvassed Leads" collapsible section
- Query quote_requests where canvasser_id = user.id
- Display: customer name, service type, status badge, quote amount
- Read-only for canvassers

---

### Step 7: MyStats.tsx (Sales Rep Dashboard)

- Add "Collections This Month" StatsCard in Key Metrics section
- Query uses join through lead to filter by assigned rep (NOT logged_by):

```text
supabase.from("lead_payments")
  .select("amount, quote_requests!inner(assigned_to)")
  .eq("quote_requests.assigned_to", user.id)
  .gte("created_at", startOfMonth)
```

- Shows monthly total as a currency StatsCard

---

## Files Created/Modified

| File | Action |
|---|---|
| Database migration | 6 new columns on quote_requests + lead_payments table with 3 RLS policies |
| `supabase/functions/send-install-confirmation/index.ts` | New |
| `supabase/functions/send-warranty-email/index.ts` | New |
| `src/pages/dashboard/LeadDetailView.tsx` | Scheduling, payments, close job, canvasser badge |
| `src/pages/admin/LeadDetail.tsx` | Same sections + completed status |
| `src/components/admin/CreateLeadDialog.tsx` | Canvasser source + dropdown |
| `src/pages/canvasser/CanvasserStats.tsx` | My Canvassed Leads section |
| `src/pages/dashboard/MyStats.tsx` | Collections stat card |

## What Does NOT Change

- Pricing logic, PDF generation, calculator UI
- Existing email functions
- Admin approval workflow (QuoteApprovalSection.tsx)
- Existing lead status flow for new/contacted/quoted/won/lost

