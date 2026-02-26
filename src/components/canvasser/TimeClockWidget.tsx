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
import { Clock, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";

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
  const [notes, setNotes] = useState("");
  const [clockingOut, setClockingOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isFlagged, setIsFlagged] = useState(false);

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
      
      if (hoursOpen > 12 && active.status === "active") {
        setIsFlagged(true);
        await supabase
          .from("canvasser_shifts")
          .update({
            status: "flagged",
            flagged_reason: "Shift open over 12 hours — requires manager review",
          })
          .eq("id", active.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        await supabase.functions.invoke("notify-flagged-shift", {
          body: {
            canvasserId: user.id,
            canvasserName: profile?.full_name || "Unknown",
            clockInAt: active.clock_in_at,
            hoursOpen: hoursOpen.toFixed(1),
          },
        });
        
        setActiveShift({ ...active, status: "flagged" } as Shift);
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

  const handleClockIn = async () => {
    if (!user) return;
    setClockingIn(true);
    try {
      const { data, error } = await supabase
        .from("canvasser_shifts")
        .insert({ canvasser_id: user.id, status: "active" })
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
    setClockingIn(false);
  };

  const handleClockOut = async () => {
    if (!user || !activeShift) return;
    setClockingOut(true);
    try {
      const clockOutTime = new Date();
      const shiftMs = clockOutTime.getTime() - new Date(activeShift.clock_in_at).getTime();
      const roundedHours = Math.round((shiftMs / 3600000) * 4) / 4;
      const finalHours = roundedHours === 0 && shiftMs > 0 ? 0.25 : roundedHours;
      const doors = doorsKnocked ? parseInt(doorsKnocked, 10) : 0;

      const { error } = await supabase
        .from("canvasser_shifts")
        .update({
          clock_out_at: clockOutTime.toISOString(),
          doors_knocked: doors || null,
          notes: notes || null,
          status: activeShift.status === "flagged" ? "flagged" : "completed",
        })
        .eq("id", activeShift.id);

      if (error) throw error;

      await updateCanvasserHours(
        user.id,
        new Date(activeShift.clock_in_at),
        finalHours,
        doors
      );

      toast.success(`Shift recorded: ${finalHours}h`);
      setClockOutModalOpen(false);
      setDoorsKnocked("");
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
    </>
  );
}
