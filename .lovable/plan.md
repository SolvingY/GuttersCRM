

## Complete Lead Management System -- Implementation Plan

### Summary

Implement internet lead tracking, ad spend analytics, manual lead creation, and updated Lead-to-Close formulas across all dashboards. All existing daily entry workflows remain unchanged.

---

### Phase 1: Database Migration

**A. New columns on `quote_requests`:**
- `lead_source TEXT DEFAULT 'internet'` -- Values: internet, phone_general, phone_canvasser, referral, walk_in, other
- `lead_type TEXT DEFAULT 'internet'` -- Values: internet, canvasser (derived from source)
- `manually_created BOOLEAN DEFAULT FALSE`
- `created_by UUID` (nullable)
- `counted_as_lead BOOLEAN DEFAULT FALSE`
- `lead_counted_at TIMESTAMPTZ`

**B. New columns on `user_metrics`:**
- `internet_leads INTEGER DEFAULT 0`
- `internet_leads_closed INTEGER DEFAULT 0`

**C. New `ad_spend_tracking` table:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `month DATE NOT NULL UNIQUE` (first of month)
- `ad_spend NUMERIC(10,2) DEFAULT 0`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()`
- `updated_by UUID`
- RLS: Admin-only for ALL operations using `has_role(auth.uid(), 'admin'::app_role)`

**D. Trigger: `count_lead_on_assign()`** (BEFORE UPDATE on quote_requests)
- When `assigned_to` changes from NULL (or different value) and `counted_as_lead = FALSE`:
  - If `lead_type = 'internet'`: increments `user_metrics.internet_leads` for the assigned user
  - If `lead_type = 'canvasser'`: increments `user_metrics.canvass_leads` for the assigned user
  - Sets `counted_as_lead = TRUE` and `lead_counted_at = NOW()`

**E. Trigger: `update_lead_close_stats()`** (AFTER UPDATE of status on quote_requests)
- When status changes to `won` and `assigned_to` is not null:
  - If `lead_type = 'internet'`: increments `internet_leads_closed`, `closed_deals`, adds `quote_amount` to `approved_revenue`
  - If `lead_type = 'canvasser'`: increments `canvass_deals_closed`, `closed_deals`, adds `quote_amount` to `approved_revenue`
- When status changes from `won` to something else (reversal): decrements the same values

**F. Update `submit_quote_request` RPC:**
- Add `lead_source DEFAULT 'internet'` and `lead_type DEFAULT 'internet'` to the INSERT statement

**G. New `create_manual_lead` RPC** (SECURITY DEFINER):
- Parameters: lead_source, service_type, full_name, email, phone, street_address, city, state, zip_code, timeline, description, assigned_to (optional), priority, admin_notes
- Maps `lead_type` from source: `phone_canvasser` = `'canvasser'`, everything else = `'internet'`
- Sets `manually_created = TRUE`, `created_by = auth.uid()`
- Returns generated reference number

**H. New `update_ad_spend` RPC** (SECURITY DEFINER):
- Upserts into `ad_spend_tracking` by `DATE_TRUNC('month', p_month)`
- Sets `updated_by = auth.uid()`

---

### Phase 2: New UI Components (8 files)

**1. `src/components/admin/CreateLeadDialog.tsx`**
- Dialog triggered from Leads page with a "+ Create Lead" button
- Form fields: Lead Source (dropdown: Internet/Website, Phone - General, Phone - From Canvasser, Referral, Walk-In, Other), Service Type (commercial, residential, gutters, repair), Full Name, Email, Phone, Street Address, City, State (default Oklahoma), Zip, Timeline (dropdown), Description (textarea), Assign To (optional sales rep dropdown), Priority (dropdown), Admin Notes (textarea)
- Calls `create_manual_lead` RPC on submit
- Shows success toast with reference number
- Invalidates `admin-leads` query on success

**2. `src/components/admin/AdSpendDialog.tsx`**
- Dialog for entering/updating monthly ad spend
- Month picker (dropdown of last 12 months) + dollar amount input
- Calls `update_ad_spend` RPC on save
- Displays a table of last 6 months of ad spend history below the input
- Opened from the AdSpendCard component

**3-7. Five Overview metric cards in `src/components/overview/`:**

- **`InternetLeadsCard.tsx`** -- Shows count of internet leads assigned this month. Queries `quote_requests` where `lead_type = 'internet'` and `assigned_at` is in current month. Displays as a StatsCard.

- **`InternetLeadCloseRateCard.tsx`** -- Shows internet LtC percentage. Calculates `internet_leads_closed / internet_leads * 100` from aggregated `user_metrics`. Color-coded using existing threshold system.

- **`InternetCostPerLeadCard.tsx`** -- Shows `ad_spend / internet_leads_count`. Fetches current month from `ad_spend_tracking` and internet lead count from `quote_requests`.

- **`InternetCostPerContractCard.tsx`** -- Shows `ad_spend / internet_contracts_won`. Internet contracts = count of `quote_requests` where `lead_type = 'internet'` and `status = 'won'` this month.

- **`AdSpendCard.tsx`** -- Shows current month ad spend with a pencil/edit button that opens AdSpendDialog. Fetches from `ad_spend_tracking`.

---

### Phase 3: Update Existing Files (7 files)

**1. `src/pages/admin/Leads.tsx`**
- Add a "Create Lead" button (using `Plus` icon) next to the existing LeadExportButton in the header area
- Import and render `CreateLeadDialog` with open/close state
- Add a lead source filter dropdown (All Sources, Internet, Phone - General, Phone - Canvasser, Referral, Walk-In, Other)
- Add lead source icons on each lead card: Globe for internet, Phone for phone_general, Users for phone_canvasser, UserPlus for referral, Building for walk_in
- Add a lead type badge: blue "Internet" or purple "Canvasser" badge next to the status badge
- Add "Manual" badge if `manually_created = true`

**2. `src/pages/admin/LeadDetail.tsx`**
- In the header area (around line 146-148), add lead source icon and lead type badge after the service label
- Show "Manually Created" badge if `lead.manually_created === true`
- Display `lead.lead_source` in the Contact Information section near `referral_source`

**3. `src/pages/dashboard/MyLeads.tsx`**
- Add lead source icon (Globe, Phone, Users, UserPlus) to each lead card, next to the service icon or in the badges row
- Add lead type badge (blue "Internet" or purple "Canvasser") next to the status badge

**4. `src/pages/dashboard/LeadDetailView.tsx`**
- Same badges as LeadDetail.tsx: lead source icon, lead type badge, manually created indicator
- Display only (no edit capability for these fields)

**5. `src/pages/dashboard/AdminOverview.tsx`**
- Import the 5 new overview cards
- Add new data fetching: query `ad_spend_tracking` for current month, query `quote_requests` for internet lead counts
- Add `internet_leads` and `internet_leads_closed` to the `user_metrics` SELECT (line 177)
- Update the `latestByUser` map to include `internetLeads` and `internetLeadsClosed`
- Update `UserDetail` interface to include `internetLeads` and `internetLeadsClosed`
- Update LtC calculation (currently line 272): change from `canvassDealsClose / canvassLeads` to `(canvassDealsClose + internetLeadsClosed) / (canvassLeads + internetLeads)`
- Add new card rows after existing ones:
  - Row: InternetLeadsCard + AdSpendCard
  - Row: Canvass LtC Card + InternetLeadCloseRateCard
  - Row: Cost Per Canvass Contract + InternetCostPerContractCard
  - Row: Cost Per Canvass Lead + InternetCostPerLeadCard

**6. `src/components/dashboard/EditMetricsModal.tsx`**
- Add a read-only section showing "Internet Leads" metrics below the existing Canvass Leads section
- Display `internet_leads` and `internet_leads_closed` as non-editable values (auto-tracked from quote_requests system)
- Add a combined LtC breakdown display:
  - Canvass LtC: `canvassDealsClose / canvassLeads`
  - Internet LtC: `internetLeadsClosed / internetLeads`
  - Total LtC: `(canvassDealsClose + internetLeadsClosed) / (canvassLeads + internetLeads)`
- Update the `UserMetrics` interface to accept `internetLeads` and `internetLeadsClosed`

**7. `src/pages/dashboard/MyStats.tsx`**
- Fetch `internet_leads` and `internet_leads_closed` from `user_metrics` (add to the SELECT on line 69)
- Update the LtC calculation (currently lines 155-157):
  - From: `canvassDealsClose / canvassLeads`
  - To: `(canvassDealsClose + internetLeadsClosed) / (canvassLeads + internetLeads)`
- Update the LtC tooltip text to reflect the new formula
- Add a lead breakdown display showing canvass leads vs internet leads in the Key Metrics section

---

### Phase 4: LtC Formula (applied everywhere)

Verified column mapping against actual database:

```text
Total Leads = canvass_leads + internet_leads
Total Closed = canvass_deals_closed + internet_leads_closed
LtC % = (Total Closed / Total Leads) * 100

Self-Gen (self_generated_deals) EXCLUDED from LtC
Total Contracts (display) = Total Closed + self_generated_deals
```

Files where this formula is applied:
- `AdminOverview.tsx` (line 272 area)
- `MyStats.tsx` (line 157 area)
- `EditMetricsModal.tsx` (new read-only display)

---

### Lead Source Mapping Reference

| Source | lead_type | Icon |
|---|---|---|
| Internet/Website | internet | Globe |
| Phone - General | internet | Phone |
| Phone - From Canvasser | canvasser | Users |
| Referral | internet | UserPlus |
| Walk-In | internet | Building |
| Other | internet | HelpCircle |

---

### What Stays Unchanged

- All daily entry systems (canvasser and sales rep)
- Social media links (already correct)
- App.tsx routes (already exist)
- Header/Hero/Footer estimate CTAs
- Quote form submission flow (only adds lead_source/lead_type defaults)
- Activity log, follow-up, quote approval workflows
- Weekly/yearly metric aggregation
- Existing RLS policies on quote_requests and user_metrics

---

### Implementation Order

1. Database migration (columns, table, triggers, RPCs) -- single migration
2. New UI components (CreateLeadDialog, AdSpendDialog, 5 metric cards)
3. Update existing files (badges, filters, LtC formula)

