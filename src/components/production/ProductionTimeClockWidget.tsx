import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Clock, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { format } from "date-fns";

function getLocation(retry = true): Promise<{ lat: number; lng: number; errorMsg?: string } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === 3 && retry) {
          getLocation(false).then(resolve);
          return;
        }
        const errorMsg =
          err.code === 1 ? 'Location permission denied' :
          err.code === 2 ? 'Location unavailable' :
          err.code === 3 ? 'Location request timed out' : 'Could not determine location';
        resolve({ lat: 0, lng: 0, errorMsg });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

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
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  hours_worked: number | null;
  notes: string | null;
  status: string;
  flagged_reason: string | null;
}

interface ProductionTimeClockWidgetProps {
  onShiftChange?: () => void;
}

export function ProductionTimeClockWidget({ onShiftChange }: ProductionTimeClockWidgetProps) {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [lastShift, setLastShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockOutModalOpen, setClockOutModalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [clockingOut, setClockingOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);
  const [geofenceWarning, setGeofenceWarning] = useState(false);
  const [pendingClockIn, setPendingClockIn] = useState<{ lat: number; lng: number } | null>(null);

  const fetchShifts = useCallback(async () => {
    if (!user) return;

    const { data: active } = await (supabase.from("production_shifts") as any)
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["active", "flagged"])
      .is("clock_out_at", null)
      .order("clock_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active) {
      setActiveShift(active as Shift);
      setElapsed(Date.now() - new Date(active.clock_in_at).getTime());

      if (active.status === "flagged") {
        setIsFlagged(true);
      }
    } else {
      setActiveShift(null);
      setIsFlagged(false);
    }

    const { data: last } = await (supabase.from("production_shifts") as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("clock_out_at", "is", null)
      .order("clock_out_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLastShift(last as Shift | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

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

  const checkGeofence = async (lat: number, lng: number): Promise<boolean> => {
    const { data: zones } = await supabase
      .from("geofence_work_zones")
      .select("id, lat, lng, radius_meters")
      .eq("is_active", true);

    if (!zones || zones.length === 0) return true;

    const { data: myAssignments } = await supabase
      .from("canvasser_zone_assignments")
      .select("zone_id")
      .eq("canvasser_id", user!.id);

    const { data: allAssignments } = await supabase
      .from("canvasser_zone_assignments")
      .select("zone_id");

    const myZoneIds = new Set((myAssignments as any[])?.map((a: any) => a.zone_id) || []);
    const zonesWithAssignments = new Set((allAssignments as any[])?.map((a: any) => a.zone_id) || []);

    const applicableZones = zones.filter((z: any) =>
      !zonesWithAssignments.has(z.id) || myZoneIds.has(z.id)
    );

    if (applicableZones.length === 0) return true;
    return applicableZones.some((zone: any) =>
      distanceMeters(lat, lng, zone.lat, zone.lng) <= zone.radius_meters
    );
  };

  const performClockIn = async (loc: { lat: number; lng: number } | null, outOfZone = false) => {
    if (!user) return;
    try {
      // Safety check — DB index is the real guard, this is a UX safeguard
      const { data: existingShift } = await (supabase.from("production_shifts") as any)
        .select('id')
        .eq('user_id', user.id)
        .is('clock_out_at', null)
        .maybeSingle();

      if (existingShift) {
        toast.error('You already have an active shift. Please check out first.');
        return;
      }

      const { data, error } = await (supabase.from("production_shifts") as any)
        .insert({
          user_id: user.id,
          status: outOfZone ? "flagged" : "active",
          clock_in_lat: loc?.lat ?? null,
          clock_in_lng: loc?.lng ?? null,
          flagged_reason: outOfZone ? "Clocked in outside geofence zone" : null,
        })
        .select()
        .single();

      if (error) throw error;
      setActiveShift(data as Shift);
      setElapsed(0);
      if (outOfZone) setIsFlagged(true);
      toast.success("Checked in!");
      onShiftChange?.();

      // Send flagged shift notification
      if (outOfZone) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();
          const userName = profile?.full_name || "Unknown";
          await supabase.functions.invoke("notify-flagged-shift", {
            body: {
              canvasserId: user.id,
              canvasserName: userName,
              clockInAt: data.clock_in_at,
              hoursOpen: 0,
              role: "Production",
            },
          });
        } catch (notifyErr) {
          console.error("Failed to send flagged shift notification:", notifyErr);
        }
      }
    } catch (err: any) {
      toast.error("Failed to check in: " + err.message);
    }
  };

  const handleClockIn = async () => {
    if (!user) return;
    setClockingIn(true);
    try {
      const loc = await getLocation();
      if (!loc) {
        toast.warning("Location not available");
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
    await performClockIn(pendingClockIn, true);
    setPendingClockIn(null);
    setClockingIn(false);
  };

  const handleClockOut = async () => {
    if (!user || !activeShift) return;
    setClockingOut(true);
    try {
      const loc = await getLocation();
      if (!loc || loc.errorMsg) {
        toast.warning(loc?.errorMsg || "Location not available");
      }

      const clockOutTime = new Date();
      const shiftMs = clockOutTime.getTime() - new Date(activeShift.clock_in_at).getTime();
      const roundedHours = Math.round((shiftMs / 3600000) * 4) / 4;
      const finalHours = roundedHours === 0 && shiftMs > 0 ? 0.25 : roundedHours;

      const { error } = await (supabase.from("production_shifts") as any)
        .update({
          clock_out_at: clockOutTime.toISOString(),
          notes: notes || null,
          status: activeShift.status === "flagged" ? "flagged" : "completed",
          hours_worked: finalHours,
          clock_out_lat: (loc && !loc.errorMsg) ? loc.lat : null,
          clock_out_lng: (loc && !loc.errorMsg) ? loc.lng : null,
        })
        .eq("id", activeShift.id);

      if (error) throw error;

      // Upsert hours to daily log — separate try/catch so shift is still saved
      try {
        const today = new Date().toISOString().split("T")[0];
        const { error: logError } = await (supabase.from("production_daily_logs") as any)
          .upsert(
            { user_id: user.id, log_date: today, hours_worked: finalHours },
            { onConflict: "user_id,log_date" }
          );
        if (logError) throw logError;
      } catch (logErr: any) {
        console.error('Daily log update failed:', logErr);
        toast.warning("Shift saved but hours tracking failed — contact your admin");
      }

      toast.success(`Shift recorded: ${finalHours}h`);
      setClockOutModalOpen(false);
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
          <p className="text-sm text-muted-foreground">Do you still want to clock in?</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setGeofenceWarning(false); setPendingClockIn(null); }}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirmOutOfZone}>Clock In Anyway</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const clockOutModal = (
    <Dialog open={clockOutModalOpen} onOpenChange={setClockOutModalOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Clock Out</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {activeShift && (
            <p className="text-sm text-muted-foreground">
              Shift duration: <strong>{formatElapsed(elapsed)}</strong>
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="prodNotes">Notes (optional)</Label>
            <Textarea
              id="prodNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Job site, work completed, etc."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setClockOutModalOpen(false)}>Cancel</Button>
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
            <p className="text-sm text-muted-foreground">This shift has been flagged for manager review.</p>
            <Button variant="outline" size="sm" onClick={() => setClockOutModalOpen(true)}>Close Shift</Button>
          </CardContent>
        </Card>
        {clockOutModal}
        {geofenceWarningModal}
      </>
    );
  }

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

  return (
    <>
      <Card>
        <CardContent className="py-5 space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span className="font-medium">You are not clocked in</span>
          </div>
          <Button className="w-full" variant="cta" size="lg" onClick={handleClockIn} disabled={clockingIn}>
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
