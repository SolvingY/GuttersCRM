import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getScoreColor } from "@/lib/dnaAssessment";

const SESSION_KEY = "ngr_new_applicants_dismissed";

export function NewApplicantsModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: newApps = [] } = useQuery({
    queryKey: ["new-applicants-notification"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("id, full_name, alignment_category, dna_score, desired_position")
        .eq("status", "new")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    if (newApps.length > 0 && !sessionStorage.getItem(SESSION_KEY)) {
      setOpen(true);
    }
  }, [newApps]);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setOpen(false);
  };

  const review = () => {
    sessionStorage.setItem(SESSION_KEY, "true");
    setOpen(false);
    navigate("/admin/applicants");
  };

  if (newApps.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase text-xl">🎉 New Applications!</DialogTitle>
          <DialogDescription>You have {newApps.length} new applicant{newApps.length > 1 ? "s" : ""} to review.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 my-4 max-h-60 overflow-y-auto">
          {newApps.map((a) => (
            <div key={a.id} className="flex items-center justify-between bg-muted rounded-lg p-3 text-sm">
              <div>
                <p className="font-semibold">{a.full_name}</p>
                <p className="text-xs text-muted-foreground">{a.alignment_category} · {a.desired_position}</p>
              </div>
              <span className={`font-heading text-lg ${getScoreColor(a.dna_score)}`}>{a.dna_score}/20</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button onClick={review} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">Review Now</Button>
          <Button variant="outline" onClick={dismiss} className="flex-1">Dismiss</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
