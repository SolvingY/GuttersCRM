import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WorkZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_meters: number;
  is_active: boolean;
}

export function AssignedZonesWidget() {
  const { user } = useAuth();
  const [zones, setZones] = useState<WorkZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchZones = async () => {
      // Get all active zones
      const { data: allZones } = await supabase
        .from("geofence_work_zones")
        .select("*")
        .eq("is_active", true);

      // Get all assignments (to determine which zones are global vs assigned)
      const { data: allAssignments } = await supabase
        .from("canvasser_zone_assignments")
        .select("zone_id, canvasser_id");

      if (!allZones) { setLoading(false); return; }

      const assignments = (allAssignments as any[]) || [];
      const zonesWithAssignments = new Set(assignments.map(a => a.zone_id));
      const myZoneIds = new Set(assignments.filter(a => a.canvasser_id === user.id).map(a => a.zone_id));

      // Applicable zones: global (no assignments) OR specifically assigned to me
      const applicable = allZones.filter((z: any) =>
        !zonesWithAssignments.has(z.id) || myZoneIds.has(z.id)
      );

      setZones(applicable);
      setLoading(false);
    };
    fetchZones();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (zones.length === 0) {
    return (
      <Card className="border-muted">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>No specific work zones assigned — check with your manager.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getZoomForRadius = (radiusMeters: number) => {
    if (radiusMeters <= 500) return 15;
    if (radiusMeters <= 1000) return 14;
    if (radiusMeters <= 2000) return 13;
    if (radiusMeters <= 5000) return 12;
    if (radiusMeters <= 10000) return 11;
    return 10;
  };

  // Calculate CSS circle size based on zoom and radius
  const getCircleSize = (radiusMeters: number, zoom: number, containerWidth: number) => {
    // Approximate meters per pixel at given zoom level (at equator)
    const metersPerPixel = 156543.03392 / Math.pow(2, zoom);
    const diameterPx = (radiusMeters * 2) / metersPerPixel;
    // Cap at 80% of container
    return Math.min(diameterPx, containerWidth * 0.8);
  };

  const radiusInMiles = (meters: number) => (meters / 1609.34).toFixed(1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Your Work Zones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {zones.map((zone) => {
            const zoom = getZoomForRadius(zone.radius_meters);
            const circleSize = getCircleSize(zone.radius_meters, zoom, 280);

            return (
              <a
                key={zone.id}
                href={`https://maps.google.com/maps?q=${zone.lat},${zone.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="relative h-32 w-full">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0, pointerEvents: "none" }}
                      src={`https://maps.google.com/maps?q=${zone.lat},${zone.lng}&z=${zoom}&output=embed`}
                      title={`Map of ${zone.name}`}
                    />
                    {/* Red radius circle overlay */}
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500 bg-red-500/15 pointer-events-none"
                      style={{
                        width: `${Math.max(circleSize, 30)}px`,
                        height: `${Math.max(circleSize, 30)}px`,
                      }}
                    />
                    {/* Click overlay */}
                    <div className="absolute inset-0 bg-transparent group-hover:bg-primary/5 transition-colors" />
                  </div>
                  <div className="p-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{zone.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {radiusInMiles(zone.radius_meters)} mi radius
                    </Badge>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
