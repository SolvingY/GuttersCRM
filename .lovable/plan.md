

# Plan: Rep-Canvasser Attribution on Weekly Updates

## Verified State Variable Names

From `WeeklyUpdates.tsx`, the exact variable names are:

**Sales Rep (`WeeklyEntry`):**
- `weeklyCanvassLeads` → attribution needed (maps to `canvass_leads_delta`)
- `weeklyCanvassDealsClose` → attribution needed (maps to `canvass_deals_closed_delta`)

**Canvasser (`CanvasserWeeklyEntry`):**
- `weeklyLeadsSet` → attribution needed (maps to `leads_set_delta`)
- `weeklyLeadsClosed` → attribution needed (maps to `leads_closed_delta`)

**Role filter:** Sales reps are fetched from `user_metrics` excluding `canvasser` role users (line 125). The role in `user_roles` is `'user'` for sales reps. This is correct.

---

## Step 1 — Database Migration

```sql
CREATE TABLE lead_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type text NOT NULL CHECK (entry_type IN (
    'canvasser_lead_set','canvasser_lead_closed','rep_canvass_lead','rep_canvass_contract'
  )),
  week_start date NOT NULL,
  week_end date NOT NULL,
  canvasser_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sales_rep_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  entered_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_attr_canvasser ON lead_attributions(canvasser_id, week_start);
CREATE INDEX idx_lead_attr_rep ON lead_attributions(sales_rep_id, week_start);
CREATE INDEX idx_lead_attr_pairing ON lead_attributions(canvasser_id, sales_rep_id, week_start);

ALTER TABLE lead_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attributions" ON lead_attributions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users view own attributions" ON lead_attributions
  FOR SELECT USING (auth.uid() = canvasser_id OR auth.uid() = sales_rep_id);

CREATE OR REPLACE VIEW canvasser_rep_close_rates AS
SELECT
  la.canvasser_id,
  cp.full_name AS canvasser_name,
  la.sales_rep_id,
  rp.full_name AS rep_name,
  la.week_start,
  COALESCE(SUM(CASE WHEN la.entry_type = 'canvasser_lead_set' THEN la.quantity END), 0) AS leads_set,
  COALESCE(SUM(CASE WHEN la.entry_type = 'canvasser_lead_closed' THEN la.quantity END), 0) AS leads_closed,
  CASE
    WHEN SUM(CASE WHEN la.entry_type = 'canvasser_lead_set' THEN la.quantity END) > 0
    THEN ROUND(
      SUM(CASE WHEN la.entry_type = 'canvasser_lead_closed' THEN la.quantity END)::numeric /
      SUM(CASE WHEN la.entry_type = 'canvasser_lead_set' THEN la.quantity END) * 100, 1)
    ELSE 0
  END AS close_rate_pct
FROM lead_attributions la
JOIN profiles cp ON cp.id = la.canvasser_id
JOIN profiles rp ON rp.id = la.sales_rep_id
GROUP BY la.canvasser_id, cp.full_name, la.sales_rep_id, rp.full_name, la.week_start;
```

---

## Step 2 — New Component: `AttributionModal.tsx`

**File:** `src/components/admin/AttributionModal.tsx`

A stepped Dialog that walks through each person with attribution-required values.

- Receives `items[]` where each item has `{ userId, displayName, tab: 'canvasser'|'sales', weeklyLeadsSet?, weeklyLeadsClosed?, weeklyCanvassLeads?, weeklyCanvassDealsClose? }` — using the exact state key names
- For canvasser items: renders N "Select Sales Rep" dropdowns per non-zero `weeklyLeadsSet` / `weeklyLeadsClosed`
- For sales items: renders N "Select Canvasser" dropdowns per non-zero `weeklyCanvassLeads` / `weeklyCanvassDealsClose`
- "Same for all" toggle per section bulk-fills from first selection
- "Skip" advances without collecting attributions; "Next →" / "Save" validates and advances
- Returns flat array of `{ entry_type, canvasser_id, sales_rep_id, quantity: 1 }` rows

**Dropdown data:**
- `salesRepOptions`: fetched from `user_roles` where `role = 'user'` joined to `profiles` (excluding archived), filtered to only those with `user_metrics` entries
- `canvasserOptions`: fetched from `user_roles` where `role = 'canvasser'` joined to `profiles` (excluding archived)

---

## Step 3 — Modify `WeeklyUpdates.tsx`

### 3a. Fetch dropdown options on mount
Add two fetches for `salesRepOptions` and `canvasserOptions` (id + full_name, role-filtered, non-archived).

### 3b. Intercept Save flow
In `handleSaveAll`, before executing saves:
1. Scan `weeklyEntries` for non-zero `weeklyCanvassLeads` or `weeklyCanvassDealsClose`
2. Scan `canvasserEntries` for non-zero `weeklyLeadsSet` or `weeklyLeadsClosed`
3. If any found → build attribution items, store pending save data, open modal, return early
4. If none → save normally

### 3c. Handle modal callbacks
- `onConfirm(attributions)`: execute full metric save (existing logic), then batch-insert attribution rows to `lead_attributions` with `week_start`/`week_end` from `getWeekRangeForDate(selectedDate)`
- `onSkipAll` / modal close: execute full metric save without attribution rows
- Both paths use existing save logic unchanged

### 3d. Close rate / lead source display
After each canvasser row in the grid, add a collapsible row querying `lead_attributions` for that canvasser + current week, showing: Rep Name | Leads Set | Leads Closed | Close %. Only renders when data exists.

After each sales rep row, add a collapsible row querying by `sales_rep_id`, showing: Canvasser Name | Leads | Contracts. Only renders when data exists.

Both use existing `Collapsible` component with chevron toggle.

---

## Files Summary

| File | Change |
|------|--------|
| Migration SQL | `lead_attributions` table + RLS + indexes + view |
| `src/components/admin/AttributionModal.tsx` | **New** — stepped attribution dialog |
| `src/pages/admin/WeeklyUpdates.tsx` | Modal trigger on save, dropdown fetches, close rate/lead source rows |

