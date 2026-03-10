import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ScheduleInterviewModalProps {
  open: boolean;
  onClose: () => void;
  applicantId: string;
  applicantName: string;
}

export function ScheduleInterviewModal({ open, onClose, applicantId, applicantName }: ScheduleInterviewModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateTime, setDateTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!dateTime) {
      toast({ title: "Please select a date and time", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("job_applications")
        .update({
          status: "scheduled_interview",
          interview_scheduled_at: new Date(dateTime).toISOString(),
          interview_notes: notes || null,
          status_changed_by: user?.id,
          status_changed_at: new Date().toISOString(),
        } as any)
        .eq("id", applicantId);
      if (error) throw error;

      // Invoke notification edge function
      try {
        await supabase.functions.invoke("notify-applicant-stage-change", {
          body: {
            applicantId,
            newStage: "scheduled_interview",
            interviewDateTime: new Date(dateTime).toISOString(),
          },
        });
      } catch (notifyErr) {
        console.error("Notification failed:", notifyErr);
      }

      queryClient.invalidateQueries({ queryKey: ["job-application"] });
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      toast({ title: "Interview scheduled", description: `Interview scheduled for ${applicantName}` });
      setDateTime("");
      setNotes("");
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to schedule", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Schedule Interview
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Schedule an interview for <strong>{applicantName}</strong>
          </p>
          <div className="space-y-2">
            <Label>Interview Date & Time</Label>
            <Input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Interview Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Location, format, preparation notes..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Confirm & Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
