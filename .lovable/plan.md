

## Canvasser Prospect Map — Approved Implementation Plan

### Step 1: Database Migration
Create `prospect_pins` table with admin-only full visibility RLS and replica identity:

```sql
CREATE TABLE IF NOT EXISTS prospect_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvasser_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  address text,
  city text,
  state text DEFAULT 'Oklahoma',
  zip text,
  status text NOT NULL DEFAULT 'not_home',
  notes text,
  photo_urls text[] DEFAULT '{}',
  quote_request_id uuid REFERENCES quote_requests(id) ON DELETE SET NULL,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospect_pins_canvasser_id ON prospect_pins(canvasser_id);
CREATE INDEX idx_prospect_pins_status ON prospect_pins(status);
CREATE INDEX idx_prospect_pins_pinned_at ON prospect_pins(pinned_at DESC);

ALTER TABLE prospect_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Canvassers manage own pins"
  ON prospect_pins FOR ALL TO authenticated
  USING (
    canvasser_id = auth.uid()
    OR has_role(auth.uid(), 'admin')
  )
  WITH CHECK (canvasser_id = auth.uid());

ALTER TABLE prospect_pins REPLICA IDENTITY FULL;
```

**Gate**: Confirm table exists before proceeding.

### Step 2: Install `@react-google-maps/api`
Add to package.json dependencies. Reference API key via `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`.

**Gate**: Confirm package in package.json.

### Step 3: Build `ProspectMapWidget.tsx`
- `GoogleMap` from `@react-google-maps/api`, centered on user GPS (fallback OKC 35.4676, -97.5164), zoom 16
- Fetch `prospect_pins` for current user on mount
- 6 colored SVG markers by status (gray, red, black, orange, green, yellow)
- Map click -> reverse geocode -> Drawer modal with address, status radio, notes, save/cancel
- Marker click -> edit modal with existing data
- Filter chips above map (All + 6 statuses)
- Pin count summary line (today only)
- `appointment_set` -> navigate to `/canvasser/create-lead` with pin state
- `damage_identified` -> toast
- Responsive: `h-[500px]` desktop, `h-[350px]` mobile

### Step 4: Build `CanvasserMap.tsx`
Simple page wrapper rendering `<ProspectMapWidget />` with heading.

### Step 5: Update Sidebar and Routes
- `CanvasserSidebar.tsx`: Add `{ icon: MapPin, label: "Prospect Map", path: "/canvasser/map" }` after "My Stats"
- `App.tsx`: Add `/canvasser/map` route to `CanvasserMap`

### Step 6: Update `CreateCanvasserLead.tsx`
- Read `location.state` for `fromPin`, `pinId`, `address`, `city`, `state`, `zip`
- Pre-populate address fields from pin state
- After successful submit with `pinState?.pinId`, update `prospect_pins.quote_request_id`
- No other changes

### Execution Order
Steps are strictly sequential with gates after Steps 1 and 2. Migration result shown before any component code is written.

