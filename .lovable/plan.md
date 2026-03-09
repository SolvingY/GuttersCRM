

# Assign Geofence Zones to Canvassers

Currently, all active geofence zones apply to all canvassers globally. This adds the ability to assign specific zones to specific canvassers, so each canvasser is only checked against their assigned zones.

## Database Change

Create a junction table `canvasser_zone_assignments`:

```sql
CREATE TABLE public.canvasser_zone_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canvasser_id uuid NOT NULL,
  zone_id uuid NOT NULL REFERENCES public.geofence_work_zones(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  UNIQUE (canvasser_id, zone_id)
);

ALTER TABLE public.canvasser_zone_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage zone assignments" ON public.canvasser_zone_assignments FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own zone assignments" ON public.canvasser_zone_assignments FOR SELECT USING (canvasser_id = auth.uid());
```

## Behavior

- **No assignments for a zone** = zone applies to everyone (backward compatible)
- **Assignments exist for a zone** = zone only applies to assigned canvassers
- This way existing zones keep working without needing to assign everyone

## UI Changes (`src/pages/admin/AdminTimeClock.tsx`)

**1. Zone card gets an "Assign" button** that opens a modal showing a checklist of all canvassers with toggles for who is assigned to that zone. Shows current assignment count on the card (e.g. "All canvassers" or "3 assigned").

**2. New state + fetch for assignments**: Fetch all `canvasser_zone_assignments` rows. Add modal state for the assignment editor.

**3. Assignment modal**: Lists all canvassers with checkboxes. Save inserts/deletes rows in the junction table.

## Clock-In Logic Change (`src/components/canvasser/TimeClockWidget.tsx`)

Update `checkGeofence` to:
1. Fetch active zones
2. For each zone, check if it has assignments — if it does, only include it if the current user is assigned
3. If no qualifying zones remain, allow clock-in anywhere (same as current "no zones" behavior)

```typescript
const { data: zones } = await supabase
  .from("geofence_work_zones")
  .select("id, lat, lng, radius_meters")
  .eq("is_active", true);

const { data: assignments } = await supabase
  .from("canvasser_zone_assignments")
  .select("zone_id")
  .eq("canvasser_id", user.id);

const myZoneIds = new Set(assignments?.map(a => a.zone_id) || []);

// Filter: include zone if it has no assignments at all, or if user is assigned
const { data: allAssignments } = await supabase
  .from("canvasser_zone_assignments")
  .select("zone_id");

const zonesWithAssignments = new Set(allAssignments?.map(a => a.zone_id) || []);

const applicableZones = zones.filter(z =>
  !zonesWithAssignments.has(z.id) || myZoneIds.has(z.id)
);
```

