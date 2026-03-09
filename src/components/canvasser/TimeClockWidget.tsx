import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { updateCanvasserHours } from "@/lib/updateCanvasserHours";
import { toast } from "sonner";
import { Clock, AlertTriangle, Loader2, MapPin, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

function getLocation(retry = true): Promise<{ lat: number; lng: number; errorMsg?: string } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('[Geolocation] API not available');
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('[Geolocation] Success:', pos.coords.latitude, pos.coords.longitude);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.error('[Geolocation] Error code:', err.code, 'message:', err.message);
        if (err.code === 3 && retry) {
          // Timeout — retry once
          console.log('[Geolocation] Retrying after timeout...');
          getLocation(false).then(resolve);
          return;
        }
        const errorMsg =
          err.code === 1
            ? 'Location permission denied — please allow location access in your browser settings'
            : err.code === 2
            ? 'Location unavailable — GPS or network error'
            : err.code === 3
            ? 'Location request timed out — please try again'
            : 'Could not determine location';
        resolve({ lat: 0, lng: 0, errorMsg });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

/** Haversine distance in meters between two lat/lng points */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Shift {
  id: string;
  canvasser_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  hours_worked: number | null;
  doors_knocked: number | null;
  notes: string | null;
  status: string;
  flagged_reason: string | null;
}

interface TimeClockWidgetProps {
  onShiftChange?: () => void;
}

export function TimeClockWidget({ onShiftChange }: TimeClockWidgetProps) {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [lastShift, setLastShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
  const [doorsKnocked, setDoorsKnocked] = useState("");
  const [conversationsHad, setConversationsHad] = useState("");
  const [notInterested, setNotInterested] = useState("");
  const [leadsSet, setLeadsSet] = useState("");
  const [notes, setNotes] = useState("");
  const [clockingOut, setClockingOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);

  // Geofence warning state
  const [geofenceWarning, setGeofenceWarning] = useState(false);
  const [pendingClockIn, setPendingClockIn] = useState<{ lat: number; lng: number } | null>(null);

  const fetchShifts = useCallback(async () => {
    if (!user) return;
    
    const { data: active } = await supabase
      .from("canvasser_shifts")
      .select("*")
      .eq("canvasser_id", user.id)
      .in("status", ["active", "flagged"])
      .is("clock_out_at", null)
      .order("clock_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active) {
      setActiveShift(active as Shift);
      setElapsed(Date.now() - new Date(active.clock_in_at).getTime());
      
      const hoursOpen = (Date.now() - new Date(active.clock_in_at).getTime()) / 3600000;
      
      if (hoursOpen > 4 && active.status === "active") {
        // Auto clock-out: cap at 4 hours, close the shift
        const cappedHours = 4;
        const clockOutTime = new Date(new Date(active.clock_in_at).getTime() + 4 * 3600000).toISOString();

        await supabase
          .from("canvasser_shifts")
          .update({
            clock_out_at: clockOutTime,
            hours_worked: cappedHours,
            status: "auto_closed",
            flagged_reason: "Auto clock-out — shift exceeded 4 hours without manual close",
          })
          .eq("id", active.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        // Record hours for the canvasser (no doors/convos since they didn't submit)
        await updateCanvasserHours(
          user.id,
          new Date(active.clock_in_at),
          cappedHours,
          0, 0, 0, 0
        );

        // Notify supervisors
        await supabase.functions.invoke("notify-auto-clockout", {
          body: {
            canvasserId: user.id,
            canvasserName: profile?.full_name || "Unknown",
            clockInAt: active.clock_in_at,
            hoursWorked: cappedHours,
          },
        });

        toast.warning("Your shift was auto-closed after 4 hours. Please clock in again if needed.");
        setActiveShift(null);
        setIsFlagged(false);
        fetchShifts();
        onShiftChange?.();
        setLoading(false);
        return;
      } else if (active.status === "flagged") {
        setIsFlagged(true);
      }
    } else {
      setActiveShift(null);
      setIsFlagged(false);
    }

    const { data: last } = await supabase
      .from("canvasser_shifts")
      .select("*")
      .eq("canvasser_id", user.id)
      .eq("status", "completed")
      .not("clock_out_at", "is", null)
      .order("clock_out_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLastShift(last as Shift | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Live timer
  useEffect(() => {
    if (!activeShift) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(activeShift.clock_in_at).getTime());
    }, 60000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const formatElapsed = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  /** Check if location is within any active geofence zone */
  const checkGeofence = async (lat: number, lng: number): Promise<boolean> => {
    const { data: zones } = await supabase
      .from("geofence_work_zones")
      .select("id, lat, lng, radius_meters")
      .eq("is_active", true);

    if (!zones || zones.length === 0) return true;

    // Fetch assignments to determine which zones apply to this user
    const { data: myAssignments } = await supabase
      .from("canvasser_zone_assignments")
      .select("zone_id")
      .eq("canvasser_id", user!.id);

    const { data: allAssignments } = await supabase
      .from("canvasser_zone_assignments")
      .select("zone_id");

    const myZoneIds = new Set((myAssignments as any[])?.map((a: any) => a.zone_id) || []);
    const zonesWithAssignments = new Set((allAssignments as any[])?.map((a: any) => a.zone_id) || []);

    // A zone applies if it has no assignments (global) or user is assigned to it
    const applicableZones = zones.filter((z: any) =>
      !zonesWithAssignments.has(z.id) || myZoneIds.has(z.id)
    );

    if (applicableZones.length === 0) return true;

    return applicableZones.some((zone: any) =>
      distanceMeters(lat, lng, zone.lat, zone.lng) <= zone.radius_meters
    );
  };

  const performClockIn = async (loc: { lat: number; lng: number } | null) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("canvasser_shifts")
        .insert({
          canvasser_id: user.id,
          status: "active",
          clock_in_lat: loc?.lat ?? null,
          clock_in_lng: loc?.lng ?? null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      setActiveShift(data as Shift);
      setElapsed(0);
      toast.success("Clocked in!");
      onShiftChange?.();
    } catch (err: any) {
      toast.error("Failed to clock in: " + err.message);
    }
  };

  const handleClockIn = async () => {
    if (!user) return;
    setClockingIn(true);
    try {
      const loc = await getLocation();
      if (!loc) {
        toast.warning("Location not available — geolocation API not supported");
        await performClockIn(null);
      } else if (loc.errorMsg) {
        toast.warning(loc.errorMsg);
        await performClockIn(null);
      } else {
        const inZone = await checkGeofence(loc.lat, loc.lng);
        if (!inZone) {
          setPendingClockIn(loc);
          setGeofenceWarning(true);
        } else {
          await performClockIn(loc);
        }
      }
    } catch (err: any) {
      toast.error("Failed to clock in: " + err.message);
    }
    setClockingIn(false);
  };

  const handleConfirmOutOfZone = async () => {
    setGeofenceWarning(false);
    setClockingIn(true);
    await performClockIn(pendingClockIn);
    setPendingClockIn(null);
    setClockingIn(false);
  };

  const handleCancelOutOfZone = () => {
    setGeofenceWarning(false);
    setPendingClockIn(null);
  };

  const handleClockOut = async () => {
    if (!user || !activeShift) return;
    setClockingOut(true);
    try {
      const loc = await getLocation();
      if (!loc) {
        toast.warning("Location not captured — enable location for tracking");
      }

      const clockOutTime = new Date();
      const shiftMs = clockOutTime.getTime() - new Date(activeShift.clock_in_at).getTime();
      const roundedHours = Math.round((shiftMs / 3600000) * 4) / 4;
      const finalHours = roundedHours === 0 && shiftMs > 0 ? 0.25 : roundedHours;
      const doors = doorsKnocked ? parseInt(doorsKnocked, 10) : 0;
      const convos = conversationsHad ? parseInt(conversationsHad, 10) : 0;
      const ni = notInterested ? parseInt(notInterested, 10) : 0;
      const ls = leadsSet ? parseInt(leadsSet, 10) : 0;

      const { error } = await supabase
        .from("canvasser_shifts")
        .update({
          clock_out_at: clockOutTime.toISOString(),
          doors_knocked: doors || null,
          conversations_had: convos || null,
          not_interested: ni || null,
          leads_set: ls || null,
          notes: notes || null,
          status: activeShift.status === "flagged" ? "flagged" : "completed",
          clock_out_lat: loc?.lat ?? null,
          clock_out_lng: loc?.lng ?? null,
        } as any)
        .eq("id", activeShift.id);

      if (error) throw error;

      await updateCanvasserHours(
        user.id,
        new Date(activeShift.clock_in_at),
        finalHours,
        doors,
        convos,
        ni,
        ls
      );

      toast.success(`Shift recorded: ${finalHours}h`);
      setClockOutModalOpen(false);
      setDoorsKnocked("");
      setConversationsHad("");
      setNotInterested("");
      setLeadsSet("");
      setNotes("");
      setActiveShift(null);
      setIsFlagged(false);
      fetchShifts();
      onShiftChange?.();
    } catch (err: any) {
      toast.error("Failed to clock out: " + err.message);
    }
    setClockingOut(false);
  };

  const geofenceWarningModal = (
    <Dialog open={geofenceWarning} onOpenChange={setGeofenceWarning}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <ShieldAlert className="h-5 w-5" />
            Outside Approved Work Zone
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You are not within any approved work zone. Your manager will be able to see your clock-in location.
          </p>
          <p className="text-sm text-muted-foreground">
            Do you still want to clock in from this location?
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancelOutOfZone}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmOutOfZone}>
            Clock In Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const clockOutModal = (
    <Dialog open={clockOutModalOpen} onOpenChange={setClockOutModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clock Out</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {activeShift && (
            <p className="text-sm text-muted-foreground">
              Shift duration: <strong>{formatElapsed(elapsed)}</strong>
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="doors">Doors Knocked (optional)</Label>
            <Input
              id="doors"
              type="number"
              min="0"
              value={doorsKnocked}
              onChange={(e) => setDoorsKnocked(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="convos">Conversations Had (optional)</Label>
            <Input
              id="convos"
              type="number"
              min="0"
              value={conversationsHad}
              onChange={(e) => setConversationsHad(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notInterested">Not Interested (optional)</Label>
            <Input
              id="notInterested"
              type="number"
              min="0"
              value={notInterested}
              onChange={(e) => setNotInterested(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leadsSet">Leads Set (optional)</Label>
            <Input
              id="leadsSet"
              type="number"
              min="0"
              value={leadsSet}
              onChange={(e) => setLeadsSet(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Area / Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Oak Park neighborhood"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setClockOutModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleClockOut} disabled={clockingOut}>
            {clockingOut ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm Clock Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // State C — Flagged
  if (activeShift && isFlagged) {
    return (
      <>
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">You have an open shift</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Clocked in: {format(new Date(activeShift.clock_in_at), "MMM d 'at' h:mm a")}
            </p>
            <p className="text-sm text-muted-foreground">
              This shift has been flagged for manager review.
            </p>
            <Button variant="outline" size="sm" onClick={() => setClockOutModalOpen(true)}>
              Close Shift
            </Button>
          </CardContent>
        </Card>
        {clockOutModal}
        {geofenceWarningModal}
      </>
    );
  }

  // State B — Clocked In
  if (activeShift) {
    return (
      <>
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="py-5 space-y-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="font-semibold">Currently Clocked In</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Started: {format(new Date(activeShift.clock_in_at), "h:mm a")}</p>
              <p className="text-lg font-bold text-foreground">{formatElapsed(elapsed)}</p>
            </div>
            <Button variant="destructive" className="w-full" onClick={() => setClockOutModalOpen(true)}>
              🔴 Clock Out
            </Button>
          </CardContent>
        </Card>
        {clockOutModal}
        {geofenceWarningModal}
      </>
    );
  }

  // State A — Clocked Out
  return (
    <>
      <Card>
        <CardContent className="py-5 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span className="font-medium">You are not clocked in</span>
          </div>
          <Button
            className="w-full"
            variant="cta"
            size="lg"
            onClick={handleClockIn}
            disabled={clockingIn}
          >
            {clockingIn ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            🟢 Clock In
          </Button>
          {lastShift && (
            <p className="text-xs text-muted-foreground">
              Last shift: {format(new Date(lastShift.clock_in_at), "MMM d")} · {lastShift.hours_worked}h
            </p>
          )}
        </CardContent>
      </Card>
      {clockOutModal}
      {geofenceWarningModal}
    </>
  );
}
