import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, X } from "lucide-react";

interface Props {
  assessmentRoute: string; // e.g. /dashboard/assessment or /canvasser/assessment
}

export function DNAAssessmentPromptModal({ assessmentRoute }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || dismissed) return;

    const checkPending = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("dna_assessment_pending")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && (data as any)?.dna_assessment_pending === true) {
        setOpen(true);
      }
    };

    checkPending();
  }, [user, dismissed]);

  const handleTakeAssessment = () => {
    setOpen(false);
    navigate(assessmentRoute);
  };

  const handleDismiss = () => {
    setOpen(false);
    setDismissed(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-accent" />
            </div>
            <div>
              <DialogTitle className="font-heading uppercase">DNA Assessment Assigned</DialogTitle>
              <DialogDescription className="text-sm">Your manager has requested that you complete the NGR DNA Assessment.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>The DNA Assessment helps us understand your work style and how best to coach and support you. Your information has been pre-filled — you just need to answer the questions.</p>
            <p className="mt-2 font-medium text-foreground">It takes about 5–10 minutes to complete.</p>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleTakeAssessment}
            >
              Take Assessment Now
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              <X className="w-4 h-4 mr-1" /> Later
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            You can complete this later, but your manager has been notified.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
